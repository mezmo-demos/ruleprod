import { describe, expect, it, vi } from 'vitest';
import type { Cart, CartLine, Order, SkuInfo } from '@ruleprod/contracts';
import { buildApp } from '../src/app.js';
import {
  UpstreamError,
  UpstreamTimeoutError,
  type OrdersCreateRequest,
} from '../src/clients.js';

const NOW = new Date('2026-07-29T12:00:00Z');

function line(overrides: Partial<CartLine> = {}): CartLine {
  return {
    id: 'line-1',
    addedAt: '2026-07-28T09:00:00.000Z',
    sku: 'RP-SR-6R4',
    qty: 12,
    stock: 412,
    product: {
      slug: 'precision-steel-rule-6',
      title: 'Precision Steel Rule — 6 in',
      variantLabel: '6 in',
      specLine: '4R graduation · stainless',
      image: 'prod-steel-rule',
    },
    baseUnitPriceCents: 3400,
    unitPriceCents: 3060,
    lineTotalCents: 36720,
    appliedTier: { minQty: 10, unitPriceCents: 3060 },
    nextTier: { minQty: 25, unitPriceCents: 2720, unitsAway: 13 },
    ...overrides,
  };
}

function cartOf(lines: CartLine[]): Cart {
  return {
    key: 'anon:abc',
    lines,
    savedForLater: [],
    unitCount: lines.reduce((sum, l) => sum + l.qty, 0),
    subtotalCents: lines.reduce((sum, l) => sum + l.lineTotalCents, 0),
    bulkSavingsCents: lines.reduce(
      (sum, l) => sum + (l.baseUnitPriceCents - l.unitPriceCents) * l.qty,
      0,
    ),
  };
}

function orderFrom(body: OrdersCreateRequest): Order {
  return {
    id: '4f8c9d2e-6f14-4c1b-9a52-0b6f3f2f9d11',
    orderNumber: 'RP-10517',
    status: 'placed',
    placedAt: '2026-07-29T12:00:01.000Z',
    arrivesEstimate: '2026-08-04T12:00:01.000Z',
    totalCents: body.totals.totalCents,
    unitCount: body.lines.reduce((sum, l) => sum + l.qty, 0),
    summaryLine: '12 units · placed 29 Jul',
    thumbs: body.lines.slice(0, 3).map((l) => l.image),
    userKey: body.userKey,
    contact: body.contact,
    shippingAddress: body.shippingAddress,
    delivery: body.delivery,
    payment: body.payment,
    promo: body.promo,
    lines: body.lines,
    totals: body.totals,
  };
}

function makeClients(cart: Cart) {
  return {
    cart: {
      getCart: vi.fn(async (_key: string) => cart),
      clearCart: vi.fn(async (_key: string) => {}),
    },
    catalog: {
      getSku: vi.fn(
        async (sku: string): Promise<SkuInfo> => ({
          sku,
          slug: 'precision-steel-rule-6',
          title: 'Precision Steel Rule — 6 in',
          variantLabel: '6 in',
          specLine: '4R graduation · stainless',
          image: 'prod-steel-rule',
          priceCents: 3400,
          stock: 412,
        }),
      ),
    },
    orders: {
      createOrder: vi.fn(async (body: OrdersCreateRequest) => orderFrom(body)),
    },
  };
}

function makeApp(clients: ReturnType<typeof makeClients>) {
  return buildApp({ clients, now: () => NOW });
}

const placeOrderBody = {
  idempotencyKey: 'idem-123',
  cartKey: 'anon:abc',
  contact: { email: 'ava@studio41.example', name: 'Ava Chen' },
  shippingAddress: {
    name: 'Ava Chen',
    street1: '41 Studio Way',
    city: 'Brooklyn',
    state: 'NY',
    zip: '11201',
    country: 'US',
  },
  delivery: 'standard',
  payment: { method: 'invoice_net30' },
};

describe('health endpoints', () => {
  it('always answers 200 on /healthz and /readyz (stateless — no DB)', async () => {
    const app = makeApp(makeClients(cartOf([])));
    expect((await app.inject({ method: 'GET', url: '/healthz' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/readyz' })).statusCode).toBe(200);
  });
});

describe('POST /api/checkout/promo', () => {
  it('returns the promo result for a valid code', async () => {
    const app = makeApp(makeClients(cartOf([])));
    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout/promo',
      payload: { code: 'SUMMER15', subtotalCents: 20000 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ valid: true, code: 'SUMMER15', percentOff: 15, discountCents: 3000 });
  });

  it.each([
    ['BOGUS', 20000, 'promo_invalid'],
    ['WELCOME10', 20000, 'promo_expired'],
    ['TRADE20', 49999, 'promo_minimum_not_met'],
  ])('rejects %s with 422 %s and a user-facing message', async (code, subtotalCents, errorCode) => {
    const app = makeApp(makeClients(cartOf([])));
    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout/promo',
      payload: { code, subtotalCents },
    });
    expect(res.statusCode).toBe(422);
    const body = res.json();
    expect(body.error.code).toBe(errorCode);
    expect(typeof body.error.message).toBe('string');
    expect(body.error.message.length).toBeGreaterThan(0);
  });

  it('rejects a malformed body with 400 invalid_request', async () => {
    const app = makeApp(makeClients(cartOf([])));
    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout/promo',
      payload: { code: 'SUMMER15' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('invalid_request');
  });
});

describe('POST /api/checkout/quote', () => {
  it('re-prices via the cart service and applies promo, shipping and tax', async () => {
    const clients = makeClients(cartOf([line()]));
    const app = makeApp(clients);
    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout/quote',
      payload: { cartKey: 'anon:abc', delivery: 'standard', promoCode: 'SUMMER15' },
    });
    expect(res.statusCode).toBe(200);
    expect(clients.cart.getCart).toHaveBeenCalledWith('anon:abc');
    const quote = res.json();
    expect(quote).toMatchObject({
      unitCount: 12,
      subtotalCents: 36720,
      bulkSavingsCents: 4080,
      promo: { code: 'SUMMER15', discountCents: 5508 },
      shippingCents: 0,
      taxCents: 2770,
      totalCents: 33982,
    });
    expect(quote.lines[0]).not.toHaveProperty('id');
    expect(quote).not.toHaveProperty('promoError');
  });

  it('answers 200 with promo: null and promoError for an invalid code', async () => {
    const app = makeApp(makeClients(cartOf([line()])));
    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout/quote',
      payload: { cartKey: 'anon:abc', delivery: 'standard', promoCode: 'WELCOME10' },
    });
    expect(res.statusCode).toBe(200);
    const quote = res.json();
    expect(quote.promo).toBeNull();
    expect(quote.promoError).toEqual({
      code: 'promo_expired',
      message: 'WELCOME10 expired on 31 May 2026.',
    });
  });

  it('maps a cart outage to 502 upstream_error', async () => {
    const clients = makeClients(cartOf([line()]));
    clients.cart.getCart.mockRejectedValue(new UpstreamError('cart', 'cart responded 500', 500));
    const app = makeApp(clients);
    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout/quote',
      payload: { cartKey: 'anon:abc', delivery: 'standard' },
    });
    expect(res.statusCode).toBe(502);
    expect(res.json().error.code).toBe('upstream_error');
  });

  it('rejects an unknown delivery method with 400 invalid_request', async () => {
    const app = makeApp(makeClients(cartOf([line()])));
    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout/quote',
      payload: { cartKey: 'anon:abc', delivery: 'overnight' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('invalid_request');
  });
});

describe('POST /api/checkout/place-order', () => {
  it('quotes, checks inventory, writes the order, clears the cart and answers 201', async () => {
    const clients = makeClients(cartOf([line()]));
    const app = makeApp(clients);
    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout/place-order',
      payload: { ...placeOrderBody, promoCode: 'SUMMER15' },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({
      orderId: '4f8c9d2e-6f14-4c1b-9a52-0b6f3f2f9d11',
      orderNumber: 'RP-10517',
      placedAt: '2026-07-29T12:00:01.000Z',
      arrivesEstimate: '2026-08-04T12:00:01.000Z',
      totals: {
        subtotalCents: 36720,
        bulkSavingsCents: 4080,
        promoDiscountCents: 5508,
        shippingCents: 0,
        taxCents: 2770,
        totalCents: 33982,
      },
    });

    expect(clients.catalog.getSku).toHaveBeenCalledWith('RP-SR-6R4');
    expect(clients.orders.createOrder).toHaveBeenCalledTimes(1);
    const sent = clients.orders.createOrder.mock.calls[0]![0];
    expect(sent).toEqual({
      idempotencyKey: 'idem-123',
      userKey: 'anon:abc', // defaults to cartKey
      contact: { email: 'ava@studio41.example', name: 'Ava Chen' },
      shippingAddress: {
        name: 'Ava Chen',
        street1: '41 Studio Way',
        city: 'Brooklyn',
        state: 'NY',
        zip: '11201',
        country: 'US',
      },
      delivery: { method: 'standard', priceCents: 0 },
      payment: { method: 'invoice_net30' },
      promo: { code: 'SUMMER15', discountCents: 5508 },
      lines: [
        {
          sku: 'RP-SR-6R4',
          slug: 'precision-steel-rule-6',
          title: 'Precision Steel Rule — 6 in',
          variantLabel: '6 in',
          image: 'prod-steel-rule',
          qty: 12,
          unitPriceCents: 3060,
          lineTotalCents: 36720,
        },
      ],
      totals: {
        subtotalCents: 36720,
        bulkSavingsCents: 4080,
        promoDiscountCents: 5508,
        shippingCents: 0,
        taxCents: 2770,
        totalCents: 33982,
      },
    });
    expect(clients.cart.clearCart).toHaveBeenCalledWith('anon:abc');
  });

  it('passes an explicit userKey through instead of the cartKey default', async () => {
    const clients = makeClients(cartOf([line()]));
    const app = makeApp(clients);
    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout/place-order',
      payload: { ...placeOrderBody, userKey: 'persona:ava' },
    });
    expect(res.statusCode).toBe(201);
    expect(clients.orders.createOrder.mock.calls[0]![0].userKey).toBe('persona:ava');
  });

  it('answers 409 conflict for an empty cart and never touches catalog or orders', async () => {
    const clients = makeClients(cartOf([]));
    const app = makeApp(clients);
    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout/place-order',
      payload: placeOrderBody,
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('conflict');
    expect(clients.catalog.getSku).not.toHaveBeenCalled();
    expect(clients.orders.createOrder).not.toHaveBeenCalled();
  });

  it('answers 422 with the specific promo error and does not place the order', async () => {
    const clients = makeClients(cartOf([line()]));
    const app = makeApp(clients);
    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout/place-order',
      payload: { ...placeOrderBody, promoCode: 'WELCOME10' },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('promo_expired');
    expect(clients.orders.createOrder).not.toHaveBeenCalled();
  });

  it('answers 409 inventory_drift naming the sku when stock dropped below the ordered qty', async () => {
    const clients = makeClients(cartOf([line({ qty: 12 })]));
    clients.catalog.getSku.mockImplementation(
      async (sku: string): Promise<SkuInfo> => ({
        sku,
        slug: 'precision-steel-rule-6',
        title: 'Precision Steel Rule — 6 in',
        variantLabel: '6 in',
        specLine: '4R graduation · stainless',
        image: 'prod-steel-rule',
        priceCents: 3400,
        stock: 3,
      }),
    );
    const app = makeApp(clients);
    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout/place-order',
      payload: placeOrderBody,
    });
    expect(res.statusCode).toBe(409);
    const body = res.json();
    expect(body.error.code).toBe('inventory_drift');
    expect(body.error.message).toContain('RP-SR-6R4');
    expect(body.error.message).toContain('3');
    expect(clients.orders.createOrder).not.toHaveBeenCalled();
    expect(clients.cart.clearCart).not.toHaveBeenCalled();
  });

  it('maps an orders timeout to 504 upstream_timeout and does not clear the cart', async () => {
    const clients = makeClients(cartOf([line()]));
    clients.orders.createOrder.mockRejectedValue(
      new UpstreamTimeoutError('orders', 'orders did not respond in time'),
    );
    const app = makeApp(clients);
    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout/place-order',
      payload: placeOrderBody,
    });
    expect(res.statusCode).toBe(504);
    expect(res.json().error.code).toBe('upstream_timeout');
    expect(clients.cart.clearCart).not.toHaveBeenCalled();
  });

  it('still answers 201 when the best-effort cart clear fails', async () => {
    const clients = makeClients(cartOf([line()]));
    clients.cart.clearCart.mockRejectedValue(new UpstreamError('cart', 'cart responded 500', 500));
    const app = makeApp(clients);
    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout/place-order',
      payload: placeOrderBody,
    });
    expect(res.statusCode).toBe(201);
    expect(clients.cart.clearCart).toHaveBeenCalledWith('anon:abc');
    expect(res.json().orderNumber).toBe('RP-10517');
  });

  it.each([
    ['payment.method', { payment: { method: 'card' } }],
    ['delivery', { delivery: 'drone' }],
    ['country', { shippingAddress: { ...placeOrderBody.shippingAddress, country: 'CA' } }],
    ['contact.email', { contact: { email: 'not-an-email' } }],
  ])('rejects an invalid %s with 400 invalid_request', async (_field, patch) => {
    const app = makeApp(makeClients(cartOf([line()])));
    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout/place-order',
      payload: { ...placeOrderBody, ...patch },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('invalid_request');
  });
});
