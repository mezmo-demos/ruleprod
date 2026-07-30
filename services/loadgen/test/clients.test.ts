import { describe, expect, it } from 'vitest';
import { PROFILES } from '../src/config.js';
import { makeClients, StepError, type FetchFn } from '../src/clients.js';
import { mintSession } from '../src/session.js';

const config = {
  profile: PROFILES.steady,
  frontendUrl: 'http://frontend.test',
  urls: {
    catalog: 'http://catalog.test',
    cart: 'http://cart.test',
    checkout: 'http://checkout.test',
    orders: 'http://orders.test',
  },
  requestTimeoutMs: 1000,
  emailDomain: 'loadgen.example',
  userAgent: 'ruleprod-loadgen/0.1',
} as const;

interface Call {
  url: string;
  init?: RequestInit;
}

function stubFetch(response: () => Response): { calls: Call[]; fetchFn: FetchFn } {
  const calls: Call[] = [];
  const fetchFn: FetchFn = async (input, init) => {
    calls.push({ url: String(input), init });
    return response();
  };
  return { calls, fetchFn };
}

const session = mintSession(() => 0.5);

describe('makeClients', () => {
  it('sends page views to the frontend with the session cookie', async () => {
    const { calls, fetchFn } = stubFetch(() => new Response('<html/>'));
    await makeClients(config, session, fetchFn).pageView('/catalog?category=trades');
    expect(calls[0]?.url).toBe('http://frontend.test/catalog?category=trades');
    expect(new Headers(calls[0]?.init?.headers).get('cookie')).toBe(session.cookie);
    expect(new Headers(calls[0]?.init?.headers).get('user-agent')).toBe(config.userAgent);
  });

  it('scopes cart calls to the session cart and encodes the key', async () => {
    const { calls, fetchFn } = stubFetch(() => Response.json({ key: session.userKey }));
    await makeClients(config, session, fetchFn).addLine('SKU-1', 2);
    expect(calls[0]?.url).toBe(
      `http://cart.test/api/carts/${encodeURIComponent(session.userKey)}/lines`,
    );
    expect(calls[0]?.init?.method).toBe('POST');
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ sku: 'SKU-1', qty: 2 });
  });

  it('surfaces API error codes as StepError', async () => {
    const { fetchFn } = stubFetch(() =>
      Response.json(
        { error: { code: 'inventory_drift', message: 'sku RL-STEEL-12 exceeds stock' } },
        { status: 409 },
      ),
    );
    const attempt = makeClients(config, session, fetchFn).checkoutQuote('standard');
    await expect(attempt).rejects.toMatchObject({
      name: 'StepError',
      step: 'checkout:quote',
      status: 409,
      code: 'inventory_drift',
    });
  });

  it('wraps network failures with the step name', async () => {
    const fetchFn: FetchFn = async () => {
      throw new Error('socket hang up');
    };
    const attempt = makeClients(config, session, fetchFn).getOrder('RP-10517');
    await expect(attempt).rejects.toThrow(/orders:get: socket hang up/);
    await expect(attempt).rejects.toBeInstanceOf(StepError);
  });

  it('omits promoCode from the quote body when not supplied', async () => {
    const { calls, fetchFn } = stubFetch(() => Response.json({ lines: [] }));
    await makeClients(config, session, fetchFn).checkoutQuote('expedited');
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      cartKey: session.userKey,
      delivery: 'expedited',
    });
  });
});
