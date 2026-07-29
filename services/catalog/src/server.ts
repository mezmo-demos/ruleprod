import Fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { HttpError } from './errors.js';
import { registerCategoryRoutes } from './routes/categories.js';
import { registerPriceQuoteRoutes } from './routes/price-quote.js';
import { registerProductRoutes } from './routes/products.js';
import { registerSkuRoutes } from './routes/skus.js';

export interface ServerDeps {
  pool: Pool;
  loggerInstance: FastifyBaseLogger;
}

export function buildServer({ pool, loggerInstance }: ServerDeps): FastifyInstance {
  const app = Fastify({ loggerInstance });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError) {
      void reply
        .status(error.statusCode)
        .send({ error: { code: error.code, message: error.message } });
      return;
    }
    const statusCode =
      typeof (error as { statusCode?: unknown }).statusCode === 'number'
        ? (error as { statusCode: number }).statusCode
        : 500;
    if (statusCode >= 400 && statusCode < 500) {
      // Fastify-generated client errors (bad JSON body, unsupported media type, ...).
      void reply.status(statusCode).send({
        error: { code: 'invalid_request', message: error.message },
      });
      return;
    }
    request.log.error({ err: error }, 'unhandled error');
    void reply.status(500).send({
      error: { code: 'upstream_error', message: 'Internal server error' },
    });
  });

  app.setNotFoundHandler((request, reply) => {
    void reply.status(404).send({
      error: { code: 'not_found', message: `No route ${request.method} ${request.url}` },
    });
  });

  // Liveness: always 200.
  app.get('/healthz', async () => ({ status: 'ok' }));

  // Readiness: 200 only when the database answers SELECT 1.
  app.get('/readyz', async (_request, reply) => {
    try {
      await pool.query('SELECT 1');
      return { status: 'ready' };
    } catch {
      return reply.status(503).send({
        error: { code: 'upstream_error', message: 'database not ready' },
      });
    }
  });

  registerCategoryRoutes(app, pool);
  registerProductRoutes(app, pool);
  registerSkuRoutes(app, pool);
  registerPriceQuoteRoutes(app, pool);

  return app;
}
