import { randomUUID } from 'node:crypto';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import {
  CATEGORY_SLUGS,
  type DeliveryMethod,
  type PaymentMethod,
  type ProductCard,
} from '@ruleprod/contracts';
import { StepError, type Clients } from './clients.js';
import { pickOne, pickWeighted, randomInt, type Rng, type Weighted } from './pacing.js';
import type { ShopperSession } from './session.js';

/** The slice of a pino logger journeys need; keeps pino out of the deps. */
export interface JourneyLog {
  info: (obj: object, msg: string) => void;
  warn: (obj: object, msg: string) => void;
}

export interface JourneyContext {
  clients: Clients;
  session: ShopperSession;
  rng: Rng;
  log: JourneyLog;
  /** Human-ish pause between steps; the runner injects real time, tests a no-op. */
  pause: () => Promise<void>;
}

export type JourneyName = 'window_shopper' | 'browser' | 'cart_builder' | 'purchaser';

/**
 * Who shows up, roughly matching a storefront's funnel: most traffic looks,
 * a quarter builds a cart and walks away, a fifth buys. Cart abandonment is
 * deliberate signal — abandoned anon carts and the occasional failed checkout
 * are exactly the mess real telemetry has to make legible.
 */
export const JOURNEY_MIX: readonly Weighted<JourneyName>[] = [
  { value: 'window_shopper', weight: 15 },
  { value: 'browser', weight: 40 },
  { value: 'cart_builder', weight: 25 },
  { value: 'purchaser', weight: 20 },
];

/**
 * Promo behaviour for purchasers. WELCOME10 is expired and TRADE20 has a
 * $500 minimum — both are picked on purpose sometimes, because real shoppers
 * paste dead codes and the promo_* error paths should light up in telemetry.
 */
const PROMO_ROLL: readonly Weighted<string | undefined>[] = [
  { value: undefined, weight: 55 },
  { value: 'SUMMER15', weight: 30 },
  { value: 'WELCOME10', weight: 10 },
  { value: 'TRADE20', weight: 5 },
];

const DELIVERY_ROLL: readonly Weighted<DeliveryMethod>[] = [
  { value: 'standard', weight: 80 },
  { value: 'expedited', weight: 20 },
];

const PAYMENT_ROLL: readonly Weighted<PaymentMethod>[] = [
  { value: 'invoice_net30', weight: 70 },
  { value: 'purchase_order', weight: 30 },
];

// ---------- Shared steps ----------

/** Land on home, walk into a category, and return its product cards. */
async function browseCatalog(ctx: JourneyContext): Promise<ProductCard[]> {
  const { clients, rng } = ctx;
  await clients.pageView('/');
  await ctx.pause();
  const category = pickOne(CATEGORY_SLUGS, rng);
  await clients.pageView(`/catalog?category=${category}`);
  const listing = await clients.listProducts(category);
  return listing.products;
}

/** View up to `max` product pages from the cards on hand; returns viewed cards. */
async function viewProducts(
  ctx: JourneyContext,
  cards: ProductCard[],
  max: number,
): Promise<ProductCard[]> {
  const viewed: ProductCard[] = [];
  const count = Math.min(randomInt(1, max, ctx.rng), cards.length);
  for (let i = 0; i < count; i++) {
    const card = pickOne(cards, ctx.rng);
    await ctx.pause();
    await ctx.clients.pageView(`/product/${card.slug}`);
    viewed.push(card);
  }
  return viewed;
}

/**
 * Add 1..maxLines lines to the cart from the viewed cards. `bulkBias` is the
 * chance a line jumps to the first bulk tier's quantity — that path exercises
 * tiered pricing and, at scale, real stock numbers.
 */
async function fillCart(
  ctx: JourneyContext,
  cards: ProductCard[],
  maxLines: number,
  bulkBias: number,
): Promise<string[]> {
  const { clients, rng } = ctx;
  const lineIds: string[] = [];
  const lineCount = Math.min(randomInt(1, maxLines, rng), cards.length);
  for (let i = 0; i < lineCount; i++) {
    const card = pickOne(cards, rng);
    const product = await clients.getProduct(card.slug);
    const variant =
      rng() < 0.7
        ? (product.variants.find((v) => v.sku === product.defaultSku) ?? product.variants[0])
        : pickOne(product.variants, rng);
    if (!variant) continue;
    const firstTier = variant.tiers[0];
    const qty =
      firstTier !== undefined && rng() < bulkBias
        ? firstTier.minQty + randomInt(0, 5, rng)
        : randomInt(1, 4, rng);
    await ctx.pause();
    const cart = await clients.addLine(variant.sku, qty);
    lineIds.push(...cart.lines.map((line) => line.id));
  }
  return [...new Set(lineIds)];
}

// ---------- Journeys ----------

/** Bounces off home and maybe one listing page. Never calls a backend. */
async function windowShopper(ctx: JourneyContext): Promise<void> {
  await ctx.clients.pageView('/');
  if (ctx.rng() < 0.5) {
    await ctx.pause();
    await ctx.clients.pageView('/catalog');
  }
  if (ctx.rng() < 0.2) {
    await ctx.pause();
    await ctx.clients.pageView('/about');
  }
}

/** Reads product pages properly but never touches a cart. */
async function browser(ctx: JourneyContext): Promise<void> {
  const cards = await browseCatalog(ctx);
  await viewProducts(ctx, cards, 3);
  if (ctx.rng() < 0.25) {
    await ctx.pause();
    await ctx.clients.pageView('/help');
  }
}

/** Builds a cart, looks at it, and walks away — the abandonment cohort. */
async function cartBuilder(ctx: JourneyContext): Promise<void> {
  const cards = await browseCatalog(ctx);
  const viewed = await viewProducts(ctx, cards, 2);
  const lineIds = await fillCart(ctx, viewed.length > 0 ? viewed : cards, 3, 0.15);
  if (lineIds.length > 0 && ctx.rng() < 0.3) {
    await ctx.pause();
    const lineId = pickOne(lineIds, ctx.rng);
    if (ctx.rng() < 0.5) {
      await ctx.clients.updateLine(lineId, randomInt(1, 6, ctx.rng));
    } else {
      await ctx.clients.removeLine(lineId);
    }
  }
  await ctx.pause();
  await ctx.clients.pageView('/cart');
}

/** The full funnel: browse, fill a cart, quote, place the order, confirm. */
async function purchaser(ctx: JourneyContext): Promise<void> {
  const { clients, session, rng } = ctx;
  const cards = await browseCatalog(ctx);
  const viewed = await viewProducts(ctx, cards, 2);
  await fillCart(ctx, viewed.length > 0 ? viewed : cards, 3, 0.25);

  await ctx.pause();
  await clients.pageView('/cart');
  await ctx.pause();
  await clients.pageView('/checkout');

  const delivery = pickWeighted(DELIVERY_ROLL, rng);
  const promoCode = pickWeighted(PROMO_ROLL, rng);
  const quote = await clients.checkoutQuote(delivery, promoCode);
  if (quote.promoError) {
    ctx.log.info(
      { promoCode, code: quote.promoError.code },
      'promo declined, continuing without it',
    );
  }

  await ctx.pause();
  const order = await clients.placeOrder({
    // Always fresh: a reused key silently replays the old order instead of
    // creating one, and loadgen must actually generate order volume.
    idempotencyKey: randomUUID(),
    cartKey: session.userKey,
    userKey: session.userKey,
    contact: session.contact,
    shippingAddress: session.address,
    delivery,
    payment: { method: pickWeighted(PAYMENT_ROLL, rng) },
    // Only send a code the quote accepted; dead codes already made their noise.
    ...(quote.promo ? { promoCode: quote.promo.code } : {}),
  });

  await clients.pageView(`/confirmation?orderId=${order.orderId}`);
  if (rng() < 0.4) {
    await ctx.pause();
    await clients.getOrder(order.orderId);
  }
}

export const JOURNEYS: Record<JourneyName, (ctx: JourneyContext) => Promise<void>> = {
  window_shopper: windowShopper,
  browser,
  cart_builder: cartBuilder,
  purchaser,
};

// ---------- Entry point ----------

const tracer = trace.getTracer('loadgen');

export type JourneyOutcome = 'completed' | 'failed';

/**
 * Run one journey under a root span. Auto-instrumented undici propagates the
 * span's context into every request, so the whole journey — loadgen through
 * frontend, catalog, cart, checkout, orders — lands as a single trace. That
 * waterfall is the reason loadgen is a monorepo service and not a k6 script.
 */
export async function runJourney(name: JourneyName, ctx: JourneyContext): Promise<JourneyOutcome> {
  return tracer.startActiveSpan(
    `journey.${name}`,
    {
      attributes: {
        'loadgen.journey': name,
        'loadgen.session_id': ctx.session.sessionId,
        'loadgen.synthetic': true,
      },
    },
    async (span) => {
      const startedAt = performance.now();
      try {
        await JOURNEYS[name](ctx);
        span.setStatus({ code: SpanStatusCode.OK });
        ctx.log.info(
          { journey: name, sessionId: ctx.session.sessionId, durationMs: elapsed(startedAt) },
          'journey completed',
        );
        return 'completed';
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR });
        if (err instanceof Error) span.recordException(err);
        const detail =
          err instanceof StepError
            ? { step: err.step, status: err.status, code: err.code }
            : { error: err instanceof Error ? err.message : String(err) };
        ctx.log.warn(
          {
            journey: name,
            sessionId: ctx.session.sessionId,
            durationMs: elapsed(startedAt),
            ...detail,
          },
          'journey failed',
        );
        return 'failed';
      } finally {
        span.end();
      }
    },
  );
}

const elapsed = (startedAt: number): number => Math.round(performance.now() - startedAt);
