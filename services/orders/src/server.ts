import Fastify, { type FastifyError, type FastifyReply } from 'fastify';
import type pg from 'pg';
import type { Logger } from 'pino';
import type { ErrorCode, OrderListResponse } from '@ruleprod/contracts';
import { validateCreateOrder, validateRekey } from './domain/validate.js';
import { createOrder, getOrder, listOrders, rekeyOrders } from './repo.js';

export interface ServerDeps {
  pool: pg.Pool;
  log: Logger;
}

function sendError(
  reply: FastifyReply,
  status: number,
  code: ErrorCode,
  message: string,
): FastifyReply {
  return reply.status(status).send({ error: { code, message } });
}

export function buildServer({ pool, log }: ServerDeps) {
  const app = Fastify({ loggerInstance: log });

  app.setNotFoundHandler((request, reply) => {
    sendError(reply, 404, 'not_found', `no route for ${request.method} ${request.url}`);
  });

  app.setErrorHandler((err: FastifyError, request, reply) => {
    const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
    if (statusCode >= 400 && statusCode < 500) {
      // Malformed JSON body, oversized payload, etc.
      sendError(reply, statusCode, 'invalid_request', err.message);
      return;
    }
    request.log.error({ err }, 'unhandled error');
    sendError(reply, 500, 'upstream_error', 'internal error');
  });

  app.get('/healthz', async () => ({ ok: true }));

  app.get('/readyz', async (_request, reply) => {
    try {
      await pool.query('SELECT 1');
      return { ok: true };
    } catch {
      return sendError(reply, 503, 'upstream_error', 'database not ready');
    }
  });

  // Create order (from checkout). Idempotent on idempotencyKey:
  // first write → 201, replay → 200 with the existing order.
  app.post('/api/orders', async (request, reply) => {
    const parsed = validateCreateOrder(request.body);
    if (!parsed.ok) {
      return sendError(reply, 400, 'invalid_request', parsed.message);
    }
    const { order, created } = await createOrder(pool, parsed.value);
    if (created) {
      request.log.info(
        { orderId: order.id, orderNumber: order.orderNumber, userKey: order.userKey },
        'order placed',
      );
    } else {
      request.log.info(
        { orderId: order.id, orderNumber: order.orderNumber, idempotencyKey: parsed.value.idempotencyKey },
        'order replayed idempotently',
      );
    }
    return reply.status(created ? 201 : 200).send(order);
  });

  // Order history for a userKey, newest first, with lifetime stats.
  app.get<{ Querystring: { userKey?: string } }>('/api/orders', async (request, reply) => {
    const userKey = request.query.userKey;
    if (typeof userKey !== 'string' || userKey.trim().length === 0) {
      return sendError(reply, 400, 'invalid_request', 'userKey query parameter is required');
    }
    const result: OrderListResponse = await listOrders(pool, userKey);
    return result;
  });

  // Guest → persona backfill.
  app.post('/api/orders/rekey', async (request, reply) => {
    const parsed = validateRekey(request.body);
    if (!parsed.ok) {
      return sendError(reply, 400, 'invalid_request', parsed.message);
    }
    const moved = await rekeyOrders(pool, parsed.value.fromUserKey, parsed.value.toUserKey);
    request.log.info(
      { fromUserKey: parsed.value.fromUserKey, toUserKey: parsed.value.toUserKey, moved },
      'orders rekeyed',
    );
    return { moved };
  });

  // Full order by uuid or RP-#####.
  app.get<{ Params: { idOrNumber: string } }>(
    '/api/orders/:idOrNumber',
    async (request, reply) => {
      const order = await getOrder(pool, request.params.idOrNumber);
      if (!order) {
        return sendError(reply, 404, 'not_found', `order ${request.params.idOrNumber} not found`);
      }
      return order;
    },
  );

  return app;
}
