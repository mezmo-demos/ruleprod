import { describe, expect, it, vi } from 'vitest';
import {
  createHttpClients,
  UpstreamError,
  UpstreamTimeoutError,
  type OrdersCreateRequest,
} from '../src/clients.js';

const urls = { cart: 'http://cart.test', catalog: 'http://catalog.test', orders: 'http://orders.test' };

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const ordersBody: OrdersCreateRequest = {
  idempotencyKey: 'idem-1',
  userKey: 'anon:abc',
  contact: { email: 'ava@studio41.example' },
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
  promo: null,
  lines: [],
  totals: {
    subtotalCents: 0,
    bulkSavingsCents: 0,
    promoDiscountCents: 0,
    shippingCents: 0,
    taxCents: 0,
    totalCents: 0,
  },
};

describe('createHttpClients', () => {
  it('GETs the cart with a URI-encoded key', async () => {
    const cart = { key: 'anon:abc', lines: [], savedForLater: [], unitCount: 0, subtotalCents: 0, bulkSavingsCents: 0 };
    const fetchImpl = vi.fn(async () => jsonResponse(cart));
    const clients = createHttpClients(urls, { fetchImpl: fetchImpl as unknown as typeof fetch });

    await expect(clients.cart.getCart('anon:abc')).resolves.toEqual(cart);
    expect(fetchImpl).toHaveBeenCalledWith('http://cart.test/api/carts/anon%3Aabc', undefined);
  });

  it('POSTs the cart clear', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ ok: true }));
    const clients = createHttpClients(urls, { fetchImpl: fetchImpl as unknown as typeof fetch });

    await clients.cart.clearCart('anon:abc');
    expect(fetchImpl).toHaveBeenCalledWith('http://cart.test/api/carts/anon%3Aabc/clear', {
      method: 'POST',
    });
  });

  it('POSTs the order as JSON with an abort signal attached', async () => {
    const order = { id: 'o-1', orderNumber: 'RP-10517' };
    const fetchImpl = vi.fn(async () => jsonResponse(order, 201));
    const clients = createHttpClients(urls, { fetchImpl: fetchImpl as unknown as typeof fetch });

    await expect(clients.orders.createOrder(ordersBody)).resolves.toEqual(order);

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://orders.test/api/orders');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'content-type': 'application/json' });
    expect(JSON.parse(init.body as string)).toEqual(ordersBody);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('accepts a 200 idempotent replay from orders', async () => {
    const order = { id: 'o-1', orderNumber: 'RP-10517' };
    const fetchImpl = vi.fn(async () => jsonResponse(order, 200));
    const clients = createHttpClients(urls, { fetchImpl: fetchImpl as unknown as typeof fetch });

    await expect(clients.orders.createOrder(ordersBody)).resolves.toEqual(order);
  });

  it('maps a TimeoutError rejection to UpstreamTimeoutError', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    });
    const clients = createHttpClients(urls, { fetchImpl: fetchImpl as unknown as typeof fetch });

    await expect(clients.orders.createOrder(ordersBody)).rejects.toBeInstanceOf(UpstreamTimeoutError);
  });

  it('maps an AbortError rejection to UpstreamTimeoutError', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new DOMException('This operation was aborted', 'AbortError');
    });
    const clients = createHttpClients(urls, { fetchImpl: fetchImpl as unknown as typeof fetch });

    await expect(clients.orders.createOrder(ordersBody)).rejects.toBeInstanceOf(UpstreamTimeoutError);
  });

  it('really times out via AbortSignal.timeout when orders never responds', async () => {
    // A fetch that only settles when the signal aborts — the 10ms deadline drives it.
    const fetchImpl = (_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
      });
    const clients = createHttpClients(urls, {
      ordersTimeoutMs: 10,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(clients.orders.createOrder(ordersBody)).rejects.toBeInstanceOf(UpstreamTimeoutError);
  });

  it('maps a non-2xx upstream response to UpstreamError with the status and message', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ error: { code: 'not_found', message: 'no such sku' } }, 404),
    );
    const clients = createHttpClients(urls, { fetchImpl: fetchImpl as unknown as typeof fetch });

    const err = await clients.catalog.getSku('RP-NOPE').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UpstreamError);
    expect(err).not.toBeInstanceOf(UpstreamTimeoutError);
    expect((err as UpstreamError).status).toBe(404);
    expect((err as UpstreamError).service).toBe('catalog');
    expect((err as UpstreamError).message).toContain('no such sku');
  });

  it('maps a network failure to UpstreamError (not a timeout)', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const clients = createHttpClients(urls, { fetchImpl: fetchImpl as unknown as typeof fetch });

    const err = await clients.cart.getCart('anon:abc').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UpstreamError);
    expect(err).not.toBeInstanceOf(UpstreamTimeoutError);
    expect((err as UpstreamError).message).toContain('unreachable');
  });
});
