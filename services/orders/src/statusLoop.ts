import type pg from 'pg';
import type { Logger } from 'pino';
import { STATUS_TRANSITIONS, type StatusThresholds } from './domain/status.js';

export interface StatusLoopOptions {
  intervalMs: number;
  thresholds: StatusThresholds;
}

export interface StatusLoop {
  /** One pass over all transitions (exposed for the loop and for tests/dev). */
  tick(): Promise<void>;
  stop(): void;
}

/**
 * Background status progression: placed → processing → in_transit → delivered
 * on age since placed_at. Each UPDATE is keyed on the current status, so any
 * number of replicas can run this concurrently without double-advancing.
 * Transitions run most-advanced first, so an order moves at most one step per
 * tick — a steady stream of transition logs for the demo.
 */
export function startStatusLoop(
  pool: pg.Pool,
  log: Logger,
  options: StatusLoopOptions,
): StatusLoop {
  const { intervalMs, thresholds } = options;
  let inFlight = false;

  async function tick(): Promise<void> {
    if (inFlight) return;
    inFlight = true;
    try {
      for (const transition of STATUS_TRANSITIONS) {
        const afterMs = thresholds[transition.afterMs];
        const result = await pool.query(
          `UPDATE orders.orders
              SET status = $1
            WHERE status = $2
              AND placed_at <= now() - make_interval(secs => $3::float8 / 1000)`,
          [transition.to, transition.from, afterMs],
        );
        const count = result.rowCount ?? 0;
        if (count > 0) {
          log.info(
            { from: transition.from, to: transition.to, count },
            'order status advanced',
          );
        } else {
          log.debug(
            { from: transition.from, to: transition.to, count },
            'no orders to advance',
          );
        }
      }
    } catch (err) {
      log.error({ err }, 'status loop tick failed');
    } finally {
      inFlight = false;
    }
  }

  log.info(
    { intervalMs, ...thresholds },
    'status progression loop started',
  );
  const timer = setInterval(() => void tick(), intervalMs);

  return {
    tick,
    stop() {
      clearInterval(timer);
      log.info('status progression loop stopped');
    },
  };
}
