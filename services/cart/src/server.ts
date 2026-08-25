/**
 * Fastify 5 HTTP surface for the cart service. Routes follow docs/CONTRACTS.md:
 * every mutation returns the full priced Cart; errors are
 * { error: { code, message } } with contract statuses.
 */
import { fastify, type FastifyInstance, type FastifyReply } from 'fastify';
import type { Pool } from 'pg';
import type { Logger } from 'pino';
import { AppError } from './errors.js';
import type { QuoteFn } from './logic/pricing.js';
import { CartService, type RestoreMode } from './service.js';

export interface ServerDeps {
  pool: Pool;
  quote: QuoteFn;
  log: Logger;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireKey(key: string): string {
  if (typeof key !== 'string' || key.trim() === '') {
    throw new AppError('invalid_request', 'Cart key must be a non-empty string');
  }
  return key;
}

/** Line/saved-cart ids are uuids; anything else can't exist → not_found. */
function requireUuid(id: string, what: string): string {
  if (!UUID_RE.test(id)) throw new AppError('not_found', `No ${what} ${id}`);
  return id;
}

function requireBody(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new AppError('invalid_request', 'Request body must be a JSON object');
  }
  return body as Record<string, unknown>;
}

function requireString(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AppError('invalid_request', `"${field}" must be a non-empty string`);
  }
  return value.trim();
}

function requireQty(body: Record<string, unknown>): number {
  const value = body.qty;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new AppError('invalid_request', '"qty" must be an integer >= 1');
  }
  return value;
}

function requireMode(body: Record<string, unknown>): RestoreMode {
  const value = body.mode;
  if (value !== 'merge' && value !== 'replace') {
    throw new AppError('invalid_request', '"mode" must be "merge" or "replace"');
  }
  return value;
}

export function buildServer({ pool, quote, log }: ServerDeps): FastifyInstance {
  const app = fastify({ logger: false });
  const carts = new CartService(pool, quote, log);

  // Accept empty bodies on JSON POSTs (save-for-later, clear, …).
  app.removeContentTypeParser('application/json');
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (_req, body: string, done) => {
      if (body === '') return done(null, undefined);
      try {
        done(null, JSON.parse(body));
      } catch {
        done(new AppError('invalid_request', 'Request body is not valid JSON', 400));
      }
    },
  );

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof AppError) {
      return reply
        .status(err.statusCode)
        .send({ error: { code: err.code, message: err.message } });
    }
    const { statusCode, message } = err as { statusCode?: number; message?: string };
    if (statusCode !== undefined && statusCode >= 400 && statusCode < 500) {
      return reply
        .status(statusCode)
        .send({ error: { code: 'invalid_request', message: message ?? 'Invalid request' } });
    }
    log.error({ err, method: req.method, url: req.url }, 'unhandled error');
    return reply
      .status(500)
      .send({ error: { code: 'upstream_error', message: 'Internal server error' } });
  });

  app.setNotFoundHandler((req, reply) => {
    reply
      .status(404)
      .send({ error: { code: 'not_found', message: `No route ${req.method} ${req.url}` } });
  });

  // ---------- health ----------

  app.get('/healthz', async () => ({ ok: true }));

  app.get('/readyz', async (_req, reply: FastifyReply) => {
    try {
      await pool.query('SELECT 1');
      return { ok: true };
    } catch {
      return reply.status(503).send({ ok: false });
    }
  });

  // ---------- cart ----------

  type KeyParams = { Params: { key: string } };
  type LineParams = { Params: { key: string; lineId: string } };
  type SavedParams = { Params: { key: string; id: string } };

  app.get<KeyParams>('/api/carts/:key', async (req) => {
    return carts.pricedCart(requireKey(req.params.key));
  });

  app.post<KeyParams>('/api/carts/:key/lines', async (req) => {
    const body = requireBody(req.body);
    return carts.addLine(requireKey(req.params.key), requireString(body, 'sku'), requireQty(body));
  });

  app.patch<LineParams>('/api/carts/:key/lines/:lineId', async (req) => {
    const body = requireBody(req.body);
    return carts.setQty(
      requireKey(req.params.key),
      requireUuid(req.params.lineId, 'line'),
      requireQty(body),
    );
  });

  app.delete<LineParams>('/api/carts/:key/lines/:lineId', async (req) => {
    return carts.removeLine(requireKey(req.params.key), requireUuid(req.params.lineId, 'line'));
  });

  app.post<LineParams>('/api/carts/:key/lines/:lineId/save-for-later', async (req) => {
    return carts.toggleSaved(
      requireKey(req.params.key),
      requireUuid(req.params.lineId, 'line'),
      true,
    );
  });

  app.post<LineParams>('/api/carts/:key/lines/:lineId/move-to-cart', async (req) => {
    return carts.toggleSaved(
      requireKey(req.params.key),
      requireUuid(req.params.lineId, 'line'),
      false,
    );
  });

  app.post<KeyParams>('/api/carts/:key/clear', async (req) => {
    return carts.clear(requireKey(req.params.key));
  });

  // ---------- saved carts ----------

  app.get<KeyParams>('/api/carts/:key/saved-carts', async (req) => {
    return { savedCarts: await carts.listSavedCarts(requireKey(req.params.key)) };
  });

  app.post<KeyParams>('/api/carts/:key/saved-carts', async (req, reply) => {
    const body = requireBody(req.body);
    const cart = await carts.createSavedCart(
      requireKey(req.params.key),
      requireString(body, 'name'),
    );
    return reply.status(201).send(cart);
  });

  app.post<SavedParams>('/api/carts/:key/saved-carts/:id/restore', async (req) => {
    const body = requireBody(req.body);
    return carts.restoreSavedCart(
      requireKey(req.params.key),
      requireUuid(req.params.id, 'saved cart'),
      requireMode(body),
    );
  });

  app.delete<SavedParams>('/api/carts/:key/saved-carts/:id', async (req) => {
    return carts.deleteSavedCart(requireKey(req.params.key), requireUuid(req.params.id, 'saved cart'));
  });

  // ---------- rekey ----------

  app.post<KeyParams>('/api/carts/:key/rekey', async (req) => {
    const key = requireKey(req.params.key);
    const body = requireBody(req.body);
    const toKey = requireString(body, 'toKey');
    if (toKey === key) {
      throw new AppError('invalid_request', '"toKey" must differ from the current key');
    }
    return carts.rekey(key, toKey);
  });

  return app;
}
