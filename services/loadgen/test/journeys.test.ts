import { describe, expect, it } from 'vitest';
import type { Cart, CheckoutQuote, Order, Product } from '@ruleprod/contracts';
import { StepError, type Clients } from '../src/clients.js';
import { JOURNEY_MIX, JOURNEYS, runJourney, type JourneyContext } from '../src/journeys.js';
import { mintSession } from '../src/session.js';

const product: Product = {
  slug: 'steel-rule-12',
  title: 'Steel Rule 12"',
  specLine: '12 in · Stainless',
  image: 'prod-steel-rule',
  priceCents: 1850,
  stock: 40,
  bulk: null,
  sale: null,
  category: 'trades',
  description: 'A rule.',
  images: ['prod-steel-rule'],
  specs: {
    material: 'Stainless steel',
    finish: 'Satin',
    thickness: '1mm',
    graduation: 'Dual',
    tolerance: '±0.1mm',
    madeIn: 'US',
  },
  rating: { average: 4.8, count: 12 },
  reviews: [],
  variants: [
    {
      sku: 'RL-STEEL-12',
      label: '12 in',
      priceCents: 1850,
      basePriceCents: 1850,
      stock: 40,
      tiers: [],
    },
  ],
  defaultSku: 'RL-STEEL-12',
};

interface StubCalls {
  pageViews: string[];
  placedOrders: Parameters<Clients['placeOrder']>[0][];
}

function stubClients(overrides: Partial<Clients> = {}): { clients: Clients; calls: StubCalls } {
  const calls: StubCalls = { pageViews: [], placedOrders: [] };
  const cart = { key: 'k', lines: [{ id: 'L1' }], savedForLater: [] } as unknown as Cart;
  const clients: Clients = {
    async pageView(path) {
      calls.pageViews.push(path);
    },
    async listProducts() {
      return { products: [product], total: 1, page: 1, perPage: 24 } as never;
    },
    async getProduct() {
      return product;
    },
    async addLine() {
      return cart;
    },
    async updateLine() {
      return cart;
    },
    async removeLine() {
      return cart;
    },
    async checkoutQuote() {
      return { promo: null, promoError: null, totalCents: 2014 } as unknown as CheckoutQuote;
    },
    async placeOrder(request) {
      calls.placedOrders.push(request);
      return {
        orderId: 'ORD-1',
        orderNumber: 'RP-10518',
        placedAt: '',
        arrivesEstimate: '',
        totals: {},
      } as never;
    },
    async getOrder() {
      return {} as Order;
    },
    ...overrides,
  };
  return { clients, calls };
}

function makeCtx(clients: Clients): JourneyContext {
  return {
    clients,
    session: mintSession(() => 0.5),
    rng: () => 0.5,
    log: { info: () => {}, warn: () => {} },
    pause: async () => {},
  };
}

describe('JOURNEY_MIX', () => {
  it('covers every journey with positive weight', () => {
    expect(new Set(JOURNEY_MIX.map((entry) => entry.value))).toEqual(
      new Set(Object.keys(JOURNEYS)),
    );
    for (const entry of JOURNEY_MIX) expect(entry.weight).toBeGreaterThan(0);
  });
});

describe('purchaser', () => {
  it('walks the funnel and places an order keyed to the anon session', async () => {
    const { clients, calls } = stubClients();
    const ctx = makeCtx(clients);
    const outcome = await runJourney('purchaser', ctx);

    expect(outcome).toBe('completed');
    expect(calls.pageViews[0]).toBe('/');
    expect(calls.pageViews).toContain('/cart');
    expect(calls.pageViews).toContain('/checkout');
    expect(calls.pageViews).toContain('/confirmation?orderId=ORD-1');

    const order = calls.placedOrders[0]!;
    expect(order.cartKey).toBe(ctx.session.userKey);
    expect(order.userKey).toBe(ctx.session.userKey);
    expect(order.cartKey).toMatch(/^anon:/);
    expect(order.contact.email).toMatch(/@loadgen\.example$/);
    expect(order.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
    // The quote declined no promo and none was accepted, so none is sent.
    expect(order.promoCode).toBeUndefined();
  });

  it('uses a fresh idempotency key per order — reuse would silently replay', async () => {
    const { clients, calls } = stubClients();
    await runJourney('purchaser', makeCtx(clients));
    await runJourney('purchaser', makeCtx(clients));
    expect(calls.placedOrders).toHaveLength(2);
    expect(calls.placedOrders[0]!.idempotencyKey).not.toBe(calls.placedOrders[1]!.idempotencyKey);
  });

  it('forwards a promo the quote accepted', async () => {
    const { clients, calls } = stubClients({
      async checkoutQuote() {
        return {
          promo: { code: 'SUMMER15', discountCents: 300 },
          promoError: null,
        } as unknown as CheckoutQuote;
      },
    });
    await runJourney('purchaser', makeCtx(clients));
    expect(calls.placedOrders[0]!.promoCode).toBe('SUMMER15');
  });
});

describe('window_shopper', () => {
  it('only views pages, never touches an API', async () => {
    const { clients, calls } = stubClients({
      async listProducts() {
        throw new Error('window shoppers must not call the catalog API');
      },
    });
    const outcome = await runJourney('window_shopper', makeCtx(clients));
    expect(outcome).toBe('completed');
    expect(calls.pageViews.length).toBeGreaterThan(0);
  });
});

describe('runJourney', () => {
  it('contains step failures instead of throwing', async () => {
    const { clients } = stubClients({
      async pageView() {
        throw new StepError('page:/', 'HTTP 503', 503);
      },
    });
    const warned: object[] = [];
    const ctx = {
      ...makeCtx(clients),
      log: { info: () => {}, warn: (obj: object) => warned.push(obj) },
    };
    const outcome = await runJourney('browser', ctx);
    expect(outcome).toBe('failed');
    expect(warned[0]).toMatchObject({ journey: 'browser', step: 'page:/', status: 503 });
  });
});
