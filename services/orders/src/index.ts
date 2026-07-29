import { createLogger } from '@ruleprod/telemetry';
import { createPool, migrate } from './db.js';
import { statusIntervalFromEnv, thresholdsFromEnv } from './domain/status.js';
import { buildServer } from './server.js';
import { startStatusLoop } from './statusLoop.js';

const log = createLogger('orders');
const pool = createPool();

try {
  await migrate(pool, log);
} catch (err) {
  log.error({ err }, 'migration failed');
  await pool.end().catch(() => undefined);
  process.exit(1);
}

const app = buildServer({ pool, log });
const port = Number(process.env.PORT ?? 3000);

try {
  await app.listen({ port, host: '0.0.0.0' });
} catch (err) {
  log.error({ err }, 'failed to start server');
  await pool.end().catch(() => undefined);
  process.exit(1);
}

const loop = startStatusLoop(pool, log, {
  intervalMs: statusIntervalFromEnv(),
  thresholds: thresholdsFromEnv(),
});

let shuttingDown = false;
async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info({ signal }, 'shutting down');
  // Backstop: force-exit if close hangs. unref'd, so it never delays a clean exit.
  const backstop = setTimeout(() => {
    log.error('shutdown timed out, forcing exit');
    process.exit(1);
  }, 10_000);
  backstop.unref();
  loop.stop();
  try {
    await app.close();
    await pool.end();
    log.info('shutdown complete');
    // No process.exit here: the event loop drains, which lets pino flush stdout.
  } catch (err) {
    log.error({ err }, 'error during shutdown');
    process.exitCode = 1;
  }
}

process.on('SIGTERM', (signal) => void shutdown(signal));
process.on('SIGINT', (signal) => void shutdown(signal));
