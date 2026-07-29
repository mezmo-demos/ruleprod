import pg from 'pg';
import { createLogger, dbConfigFromEnv, serviceUrls } from '@ruleprod/telemetry';
import { makeQuoteFn } from './catalog.js';
import { migrate } from './migrate.js';
import { buildServer } from './server.js';

const log = createLogger('cart');

const dbConfig = dbConfigFromEnv();
// DATABASE_URL wins over the individual parts when both are present.
const pool = new pg.Pool(
  dbConfig.connectionString ? { connectionString: dbConfig.connectionString } : dbConfig,
);
pool.on('error', (err) => log.error({ err }, 'idle postgres client error'));

await migrate(pool, log);

const catalogUrl = serviceUrls().catalog;
const app = buildServer({ pool, quote: makeQuoteFn(catalogUrl), log });

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: '0.0.0.0' });
log.info({ port, catalogUrl }, 'cart service listening');

let shuttingDown = false;
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info({ signal }, 'shutting down');
    void app
      .close()
      .then(() => pool.end())
      .then(() => process.exit(0))
      .catch((err) => {
        log.error({ err }, 'error during shutdown');
        process.exit(1);
      });
  });
}
