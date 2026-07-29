import { createLogger, serviceUrls } from '@ruleprod/telemetry';
import type { FastifyBaseLogger } from 'fastify';
import { buildApp } from './app.js';
import { createHttpClients } from './clients.js';

const logger = createLogger('checkout');
const urls = serviceUrls();

const app = buildApp({
  clients: createHttpClients({ cart: urls.cart, catalog: urls.catalog, orders: urls.orders }),
  // telemetry pins pino v10 while fastify's types bundle v9 — structurally compatible.
  logger: logger as unknown as FastifyBaseLogger,
});

const port = Number(process.env.PORT ?? 3000);

try {
  await app.listen({ port, host: '0.0.0.0' });
} catch (err) {
  logger.error({ err }, 'checkout failed to start');
  process.exit(1);
}
