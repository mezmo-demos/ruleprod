/**
 * Upstream clients (cart, catalog, orders) behind a small injected interface,
 * so the orchestration in app.ts is testable with fakes and each network hop
 * stays a clearly separated step in traces.
 */

import type {
  Cart,
  CheckoutTotals,
  DeliveryMethod,
  Order,
  OrderLine,
  PaymentMethod,
  ShippingAddress,
  SkuInfo,
} from '@ruleprod/contracts';
import { ORDERS_TIMEOUT_MS } from './config.js';

export type UpstreamService = 'cart' | 'catalog' | 'orders';

export class UpstreamError extends Error {
  constructor(
    readonly service: UpstreamService,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'UpstreamError';
  }
}

export class UpstreamTimeoutError extends UpstreamError {
  constructor(service: UpstreamService, message: string) {
    super(service, message);
    this.name = 'UpstreamTimeoutError';
  }
}

/** Body for orders `POST /api/orders`, exactly as CONTRACTS.md defines it. */
export interface OrdersCreateRequest {
  idempotencyKey: string;
  userKey: string;
  contact: { email: string; name?: string };
  shippingAddress: ShippingAddress;
  delivery: { method: DeliveryMethod; priceCents: number };
  payment: { method: PaymentMethod };
  promo: { code: string; discountCents: number } | null;
  lines: OrderLine[];
  totals: CheckoutTotals;
}

export interface CartClient {
  getCart(key: string): Promise<Cart>;
  clearCart(key: string): Promise<void>;
}

export interface CatalogClient {
  getSku(sku: string): Promise<SkuInfo>;
}

export interface OrdersClient {
  /** Resolves for both 201 (created) and 200 (idempotent replay). */
  createOrder(body: OrdersCreateRequest): Promise<Order>;
}

export interface UpstreamClients {
  cart: CartClient;
  catalog: CatalogClient;
  orders: OrdersClient;
}

export interface HttpClientOptions {
  ordersTimeoutMs?: number;
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

const isAbortLike = (err: unknown): boolean =>
  err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    if (body?.error?.message) {
      return body.error.message;
    }
  } catch {
    // non-JSON body — fall through to the status line
  }
  return `HTTP ${res.status}`;
}

export function createHttpClients(
  urls: { cart: string; catalog: string; orders: string },
  options: HttpClientOptions = {},
): UpstreamClients {
  const { ordersTimeoutMs = ORDERS_TIMEOUT_MS, fetchImpl = fetch } = options;

  async function request(
    service: UpstreamService,
    url: string,
    init?: RequestInit,
  ): Promise<Response> {
    let res: Response;
    try {
      res = await fetchImpl(url, init);
    } catch (err) {
      if (isAbortLike(err)) {
        throw new UpstreamTimeoutError(service, `${service} did not respond in time`);
      }
      const detail = err instanceof Error ? err.message : String(err);
      throw new UpstreamError(service, `${service} is unreachable: ${detail}`);
    }
    if (!res.ok) {
      throw new UpstreamError(
        service,
        `${service} responded ${res.status}: ${await readErrorMessage(res)}`,
        res.status,
      );
    }
    return res;
  }

  return {
    cart: {
      async getCart(key) {
        const res = await request('cart', `${urls.cart}/api/carts/${encodeURIComponent(key)}`);
        return (await res.json()) as Cart;
      },
      async clearCart(key) {
        await request('cart', `${urls.cart}/api/carts/${encodeURIComponent(key)}/clear`, {
          method: 'POST',
        });
      },
    },
    catalog: {
      async getSku(sku) {
        const res = await request('catalog', `${urls.catalog}/api/skus/${encodeURIComponent(sku)}`);
        return (await res.json()) as SkuInfo;
      },
    },
    orders: {
      async createOrder(body) {
        const res = await request('orders', `${urls.orders}/api/orders`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(ordersTimeoutMs),
        });
        return (await res.json()) as Order;
      },
    },
  };
}
