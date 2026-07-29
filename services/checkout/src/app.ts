/**
 * Checkout HTTP surface. This is the trace-worthy orchestration path of the
 * demo (frontend → checkout → cart → catalog → orders), so every upstream
 * call is a clearly separated, logged step.
 *
 * NOTE: there are deliberately no card-shaped fields in any schema here —
 * payment is a label (`invoice_net30` | `purchase_order`) only. Never add them.
 */

import Fastify, {
  type FastifyBaseLogger,
  type FastifyError,
  type FastifyInstance,
  type FastifyReply,
} from 'fastify';
import type {
  DeliveryMethod,
  ErrorCode,
  PlaceOrderRequest,
  PlaceOrderResponse,
  PromoResult,
} from '@ruleprod/contracts';
import {
  UpstreamError,
  UpstreamTimeoutError,
  type OrdersCreateRequest,
  type UpstreamClients,
} from './clients.js';
import { buildQuote } from './pricing.js';
import { validatePromo } from './promo.js';

export interface AppOptions {
  clients: UpstreamClients;
  logger?: FastifyBaseLogger;
  /** Injectable clock for deterministic promo-expiry tests. */
  now?: () => Date;
}

interface PromoBody {
  code: string;
  subtotalCents: number;
}

interface QuoteBody {
  cartKey: string;
  delivery: DeliveryMethod;
  promoCode?: string;
}

function sendError(reply: FastifyReply, status: number, code: ErrorCode, message: string) {
  return reply.status(status).send({ error: { code, message } });
}

const promoSchema = {
  body: {
    type: 'object',
    required: ['code', 'subtotalCents'],
    properties: {
      code: { type: 'string', minLength: 1 },
      subtotalCents: { type: 'integer', minimum: 0 },
    },
  },
} as const;

const quoteSchema = {
  body: {
    type: 'object',
    required: ['cartKey', 'delivery'],
    properties: {
      cartKey: { type: 'string', minLength: 1 },
      delivery: { type: 'string', enum: ['standard', 'expedited'] },
      promoCode: { type: 'string' },
    },
  },
} as const;

const placeOrderSchema = {
  body: {
    type: 'object',
    required: ['idempotencyKey', 'cartKey', 'contact', 'shippingAddress', 'delivery', 'payment'],
    properties: {
      idempotencyKey: { type: 'string', minLength: 1 },
      cartKey: { type: 'string', minLength: 1 },
      userKey: { type: 'string', minLength: 1 },
      contact: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' },
          name: { type: 'string' },
        },
      },
      shippingAddress: {
        type: 'object',
        required: ['name', 'street1', 'city', 'state', 'zip', 'country'],
        properties: {
          name: { type: 'string', minLength: 1 },
          street1: { type: 'string', minLength: 1 },
          street2: { type: 'string' },
          city: { type: 'string', minLength: 1 },
          state: { type: 'string', minLength: 1 },
          zip: { type: 'string', minLength: 1 },
          country: { type: 'string', enum: ['US'] },
        },
      },
      delivery: { type: 'string', enum: ['standard', 'expedited'] },
      payment: {
        type: 'object',
        required: ['method'],
        properties: {
          method: { type: 'string', enum: ['invoice_net30', 'purchase_order'] },
        },
      },
      promoCode: { type: 'string' },
    },
  },
} as const;

export function buildApp(options: AppOptions): FastifyInstance {
  const { clients, now = () => new Date() } = options;
  const app: FastifyInstance = options.logger
    ? Fastify({ loggerInstance: options.logger })
    : Fastify({ logger: false });

  app.setErrorHandler((err: FastifyError, request, reply) => {
    if (err.validation) {
      return sendError(reply, 400, 'invalid_request', err.message);
    }
    if (err instanceof UpstreamTimeoutError) {
      request.log.error({ err, upstream: err.service }, 'upstream timeout');
      return sendError(reply, 504, 'upstream_timeout', err.message);
    }
    if (err instanceof UpstreamError) {
      request.log.error({ err, upstream: err.service, status: err.status }, 'upstream error');
      return sendError(reply, 502, 'upstream_error', err.message);
    }
    if (err.statusCode !== undefined && err.statusCode >= 400 && err.statusCode < 500) {
      // malformed JSON, wrong content-type, oversized body, …
      return sendError(reply, 400, 'invalid_request', err.message);
    }
    request.log.error({ err }, 'unhandled error');
    return sendError(reply, 500, 'upstream_error', 'Something went wrong handling this request.');
  });

  // Stateless service: liveness and readiness are both unconditional.
  app.get('/healthz', async () => ({ status: 'ok' }));
  app.get('/readyz', async () => ({ status: 'ok' }));

  app.post<{ Body: PromoBody }>(
    '/api/checkout/promo',
    { schema: promoSchema },
    async (request, reply) => {
      const { code, subtotalCents } = request.body;
      const outcome = validatePromo(code, subtotalCents, now());
      if (!outcome.ok) {
        request.log.info({ step: 'promo_validate', code, reason: outcome.code }, 'promo rejected');
        return sendError(reply, 422, outcome.code, outcome.message);
      }
      request.log.info(
        { step: 'promo_validate', code: outcome.code, discountCents: outcome.discountCents },
        'promo accepted',
      );
      const result: PromoResult = {
        valid: true,
        code: outcome.code,
        percentOff: outcome.percentOff,
        discountCents: outcome.discountCents,
      };
      return reply.send(result);
    },
  );

  app.post<{ Body: QuoteBody }>(
    '/api/checkout/quote',
    { schema: quoteSchema },
    async (request, reply) => {
      const { cartKey, delivery, promoCode } = request.body;

      request.log.info({ step: 'fetch_cart', cartKey }, 'quote: fetching priced cart');
      const cart = await clients.cart.getCart(cartKey);

      request.log.info(
        { step: 'assemble_quote', cartKey, lines: cart.lines.length, subtotalCents: cart.subtotalCents },
        'quote: applying promo, shipping and tax',
      );
      const quote = buildQuote(cart, delivery, promoCode, now());
      return reply.send(quote);
    },
  );

  app.post<{ Body: PlaceOrderRequest }>(
    '/api/checkout/place-order',
    { schema: placeOrderSchema },
    async (request, reply) => {
      const body = request.body;
      const { idempotencyKey, cartKey, delivery, promoCode } = body;
      const userKey = body.userKey ?? cartKey;
      const log = request.log;

      // Step 1 — re-price the cart (cart joins catalog price-quotes; never trust the client).
      log.info({ step: 'fetch_cart', cartKey, idempotencyKey }, 'place-order: fetching priced cart');
      const cart = await clients.cart.getCart(cartKey);
      if (cart.lines.length === 0) {
        log.warn({ step: 'fetch_cart', cartKey }, 'place-order: cart is empty');
        return sendError(reply, 409, 'conflict', 'Your cart is empty — there is nothing to order.');
      }

      // Step 2 — order-level maths; a bad promo blocks the order rather than silently repricing it.
      const quote = buildQuote(cart, delivery, promoCode, now());
      if (quote.promoError) {
        log.info(
          { step: 'promo_validate', code: promoCode, reason: quote.promoError.code },
          'place-order: promo rejected',
        );
        return sendError(reply, 422, quote.promoError.code, quote.promoError.message);
      }

      // Step 3 — fresh per-sku inventory check against catalog.
      for (const line of quote.lines) {
        log.info({ step: 'inventory_check', sku: line.sku, qty: line.qty }, 'place-order: verifying stock');
        const skuInfo = await clients.catalog.getSku(line.sku);
        if (line.qty > skuInfo.stock) {
          log.warn(
            { step: 'inventory_check', sku: line.sku, qty: line.qty, stock: skuInfo.stock },
            'place-order: inventory drift',
          );
          return sendError(
            reply,
            409,
            'inventory_drift',
            `Only ${skuInfo.stock} of ${line.sku} ${skuInfo.stock === 1 ? 'is' : 'are'} in stock — your cart asks for ${line.qty}.`,
          );
        }
      }

      // Step 4 — write the order (5s deadline; orders dedupes on idempotencyKey).
      const ordersBody: OrdersCreateRequest = {
        idempotencyKey,
        userKey,
        contact: { email: body.contact.email, name: body.contact.name },
        shippingAddress: {
          name: body.shippingAddress.name,
          street1: body.shippingAddress.street1,
          street2: body.shippingAddress.street2,
          city: body.shippingAddress.city,
          state: body.shippingAddress.state,
          zip: body.shippingAddress.zip,
          country: body.shippingAddress.country,
        },
        delivery: { method: delivery, priceCents: quote.shippingCents },
        payment: { method: body.payment.method },
        promo: quote.promo,
        lines: quote.lines.map((line) => ({
          sku: line.sku,
          slug: line.product.slug,
          title: line.product.title,
          variantLabel: line.product.variantLabel,
          image: line.product.image,
          qty: line.qty,
          unitPriceCents: line.unitPriceCents,
          lineTotalCents: line.lineTotalCents,
        })),
        totals: {
          subtotalCents: quote.subtotalCents,
          bulkSavingsCents: quote.bulkSavingsCents,
          promoDiscountCents: quote.promo?.discountCents ?? 0,
          shippingCents: quote.shippingCents,
          taxCents: quote.taxCents,
          totalCents: quote.totalCents,
        },
      };
      log.info(
        { step: 'create_order', idempotencyKey, userKey, totalCents: quote.totalCents },
        'place-order: writing order',
      );
      const order = await clients.orders.createOrder(ordersBody);

      // Step 5 — best-effort cart clear; a failure here must never lose the placed order.
      log.info({ step: 'clear_cart', cartKey, orderId: order.id }, 'place-order: clearing cart');
      try {
        await clients.cart.clearCart(cartKey);
      } catch (err) {
        log.warn(
          { step: 'clear_cart', cartKey, orderId: order.id, err },
          'place-order: cart clear failed (non-fatal)',
        );
      }

      const response: PlaceOrderResponse = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        placedAt: order.placedAt,
        arrivesEstimate: order.arrivesEstimate,
        totals: order.totals,
      };
      log.info(
        { step: 'done', orderId: order.id, orderNumber: order.orderNumber },
        'place-order: complete',
      );
      return reply.status(201).send(response);
    },
  );

  return app;
}
