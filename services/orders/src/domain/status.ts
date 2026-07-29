import type { OrderStatus } from '@ruleprod/contracts';

/** Age thresholds (ms since placedAt) at which an order advances. */
export interface StatusThresholds {
  processingAfterMs: number;
  inTransitAfterMs: number;
  deliveredAfterMs: number;
}

/** Contract defaults: 2 min → processing, 6 min → in_transit, 18 min → delivered. */
export const DEFAULT_THRESHOLDS: StatusThresholds = {
  processingAfterMs: 2 * 60_000,
  inTransitAfterMs: 6 * 60_000,
  deliveredAfterMs: 18 * 60_000,
};

/** The status an order of the given age should have reached. */
export function statusForAge(ageMs: number, thresholds: StatusThresholds): OrderStatus {
  if (ageMs >= thresholds.deliveredAfterMs) return 'delivered';
  if (ageMs >= thresholds.inTransitAfterMs) return 'in_transit';
  if (ageMs >= thresholds.processingAfterMs) return 'processing';
  return 'placed';
}

export interface StatusTransition {
  from: OrderStatus;
  to: OrderStatus;
  afterMs: keyof StatusThresholds;
}

/**
 * Single-step transitions the background loop applies, most-advanced first so
 * one tick moves any order at most one step (each UPDATE is keyed on the
 * current status, so concurrent replicas never double-advance).
 */
export const STATUS_TRANSITIONS: readonly StatusTransition[] = [
  { from: 'in_transit', to: 'delivered', afterMs: 'deliveredAfterMs' },
  { from: 'processing', to: 'in_transit', afterMs: 'inTransitAfterMs' },
  { from: 'placed', to: 'processing', afterMs: 'processingAfterMs' },
];

function envMs(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return fallback;
  return value;
}

/** Thresholds with per-transition env overrides applied. */
export function thresholdsFromEnv(env: NodeJS.ProcessEnv = process.env): StatusThresholds {
  return {
    processingAfterMs: envMs(env, 'ORDERS_PROCESSING_AFTER_MS', DEFAULT_THRESHOLDS.processingAfterMs),
    inTransitAfterMs: envMs(env, 'ORDERS_IN_TRANSIT_AFTER_MS', DEFAULT_THRESHOLDS.inTransitAfterMs),
    deliveredAfterMs: envMs(env, 'ORDERS_DELIVERED_AFTER_MS', DEFAULT_THRESHOLDS.deliveredAfterMs),
  };
}

/** Loop cadence; default 30s. */
export function statusIntervalFromEnv(env: NodeJS.ProcessEnv = process.env): number {
  return envMs(env, 'ORDERS_STATUS_INTERVAL_MS', 30_000);
}
