import { createLogger } from '@ruleprod/telemetry';
import type { FastifyBaseLogger } from 'fastify';
import { createPool } from './db.js';
import { migrate } from './migrate.js';
import { buildServer } from './server.js';

const logger = createLogger('catalog');
const pool = createPool();
pool.on('error', (err) => logger.error({ err }, 'pg pool error'));

const app = buildServer({ pool, loggerInstance: logger as unknown as FastifyBaseLogger });

let shuttingDown = false;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Apply migrations with retry so a database that comes up after us (compose,
 * fresh cluster) doesn't crash-loop the service; /healthz is already live and
 * /readyz stays 503 until the DB answers.
 */
async function migrateWithRetry(): Promise<void> {
  for (let attempt = 1; !shuttingDown; attempt += 1) {
    try {
      await migrate(pool, logger);
      return;
    } catch (err) {
      logger.warn({ err, attempt }, 'migration failed, retrying in 2s');
      await sleep(2000);
    }
  }
}

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'shutting down');
  try {
    await app.close();
    await pool.end();
  } catch (err) {
    logger.error({ err }, 'error during shutdown');
  }
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

const port = Number(process.env.PORT ?? 3000);
try {
  await app.listen({ port, host: '0.0.0.0' });
  await migrateWithRetry();
} catch (err) {
  logger.error({ err }, 'failed to start');
  process.exit(1);
}
