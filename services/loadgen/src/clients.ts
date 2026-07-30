import type {
  ApiError,
  Cart,
  CheckoutQuote,
  DeliveryMethod,
  Order,
  PlaceOrderRequest,
  PlaceOrderResponse,
  Product,
  ProductListResponse,
} from '@ruleprod/contracts';
import type { LoadgenConfig } from './config.js';
import type { ShopperSession } from './session.js';

/**
 * A journey step that came back wrong. Carries enough to log a useful line;
 * journeys treat any StepError as "this shopper gave up".
 */
export class StepError extends Error {
  constructor(
    readonly step: string,
    message: string,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(`${step}: ${message}`);
    this.name = 'StepError';
  }
}

export type FetchFn = typeof fetch;

/**
 * The split that keeps loadgen build-proof: page views go through the
 * frontend (cookie-authed, exactly like a browser GET), but mutations hit the
 * backend APIs directly. Frontend writes are Next.js Server Actions keyed by
 * a per-build `Next-Action` hash, so an HTTP client that posted them would
 * break on every deploy of main.
 */
export interface Clients {
  /** GET a frontend page with the session cookie; body is drained and discarded. */
  pageView(path: string): Promise<void>;
  listProducts(category?: string): Promise<ProductListResponse>;
  getProduct(slug: string): Promise<Product>;
  addLine(sku: string, qty: number): Promise<Cart>;
  updateLine(lineId: string, qty: number): Promise<Cart>;
  removeLine(lineId: string): Promise<Cart>;
  checkoutQuote(delivery: DeliveryMethod, promoCode?: string): Promise<CheckoutQuote>;
  placeOrder(request: PlaceOrderRequest): Promise<PlaceOrderResponse>;
  getOrder(idOrNumber: string): Promise<Order>;
}

export function makeClients(
  config: LoadgenConfig,
  session: ShopperSession,
  fetchFn: FetchFn = fetch,
): Clients {
  const { urls, frontendUrl, requestTimeoutMs } = config;
  const cartBase = `${urls.cart}/api/carts/${encodeURIComponent(session.userKey)}`;

  async function request(step: string, url: string, init?: RequestInit): Promise<Response> {
    let response: Response;
    try {
      response = await fetchFn(url, { ...init, signal: AbortSignal.timeout(requestTimeoutMs) });
    } catch (err) {
      throw new StepError(step, err instanceof Error ? err.message : String(err));
    }
    if (!response.ok) {
      let code: string | undefined;
      let message = `HTTP ${response.status}`;
      try {
        const body = (await response.json()) as ApiError;
        code = body.error?.code;
        if (body.error?.message) message = `${message} ${body.error.message}`;
      } catch {
        // Non-JSON error body (frontend HTML error page); status alone will do.
      }
      throw new StepError(step, message, response.status, code);
    }
    return response;
  }

  async function api<T>(step: string, url: string, init?: RequestInit): Promise<T> {
    const response = await request(step, url, init);
    return (await response.json()) as T;
  }

  const post = (body: unknown): RequestInit => ({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  return {
    async pageView(path) {
      const response = await request(`page:${path}`, `${frontendUrl}${path}`, {
        headers: { cookie: session.cookie },
      });
      // Drain so undici can reuse the socket; the HTML itself is irrelevant.
      await response.arrayBuffer();
    },

    listProducts(category) {
      const query = category === undefined ? '' : `?category=${encodeURIComponent(category)}`;
      return api('catalog:list', `${urls.catalog}/api/products${query}`);
    },

    getProduct(slug) {
      return api('catalog:product', `${urls.catalog}/api/products/${encodeURIComponent(slug)}`);
    },

    addLine(sku, qty) {
      return api('cart:add-line', `${cartBase}/lines`, post({ sku, qty }));
    },

    updateLine(lineId, qty) {
      return api('cart:update-line', `${cartBase}/lines/${lineId}`, {
        ...post({ qty }),
        method: 'PATCH',
      });
    },

    removeLine(lineId) {
      return api('cart:remove-line', `${cartBase}/lines/${lineId}`, { method: 'DELETE' });
    },

    checkoutQuote(delivery, promoCode) {
      return api(
        'checkout:quote',
        `${urls.checkout}/api/checkout/quote`,
        post({ cartKey: session.userKey, delivery, ...(promoCode ? { promoCode } : {}) }),
      );
    },

    placeOrder(requestBody) {
      return api(
        'checkout:place-order',
        `${urls.checkout}/api/checkout/place-order`,
        post(requestBody),
      );
    },

    getOrder(idOrNumber) {
      return api('orders:get', `${urls.orders}/api/orders/${encodeURIComponent(idOrNumber)}`);
    },
  };
}
