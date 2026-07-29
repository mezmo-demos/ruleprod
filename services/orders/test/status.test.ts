import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THRESHOLDS,
  STATUS_TRANSITIONS,
  statusForAge,
  statusIntervalFromEnv,
  thresholdsFromEnv,
} from '../src/domain/status.js';

const MIN = 60_000;

describe('statusForAge', () => {
  it('is placed before the processing threshold', () => {
    expect(statusForAge(0, DEFAULT_THRESHOLDS)).toBe('placed');
    expect(statusForAge(2 * MIN - 1, DEFAULT_THRESHOLDS)).toBe('placed');
  });

  it('advances to processing at exactly 2 minutes', () => {
    expect(statusForAge(2 * MIN, DEFAULT_THRESHOLDS)).toBe('processing');
    expect(statusForAge(6 * MIN - 1, DEFAULT_THRESHOLDS)).toBe('processing');
  });

  it('advances to in_transit at exactly 6 minutes', () => {
    expect(statusForAge(6 * MIN, DEFAULT_THRESHOLDS)).toBe('in_transit');
    expect(statusForAge(18 * MIN - 1, DEFAULT_THRESHOLDS)).toBe('in_transit');
  });

  it('advances to delivered at exactly 18 minutes and stays there', () => {
    expect(statusForAge(18 * MIN, DEFAULT_THRESHOLDS)).toBe('delivered');
    expect(statusForAge(365 * 24 * 60 * MIN, DEFAULT_THRESHOLDS)).toBe('delivered');
  });

  it('honours custom thresholds', () => {
    const fast = { processingAfterMs: 5_000, inTransitAfterMs: 10_000, deliveredAfterMs: 15_000 };
    expect(statusForAge(4_999, fast)).toBe('placed');
    expect(statusForAge(5_000, fast)).toBe('processing');
    expect(statusForAge(12_000, fast)).toBe('in_transit');
    expect(statusForAge(15_000, fast)).toBe('delivered');
  });
});

describe('STATUS_TRANSITIONS', () => {
  it('covers the full progression one step at a time', () => {
    expect(STATUS_TRANSITIONS).toEqual([
      { from: 'in_transit', to: 'delivered', afterMs: 'deliveredAfterMs' },
      { from: 'processing', to: 'in_transit', afterMs: 'inTransitAfterMs' },
      { from: 'placed', to: 'processing', afterMs: 'processingAfterMs' },
    ]);
  });
});

describe('thresholdsFromEnv', () => {
  it('returns contract defaults with no overrides', () => {
    expect(thresholdsFromEnv({})).toEqual({
      processingAfterMs: 120_000,
      inTransitAfterMs: 360_000,
      deliveredAfterMs: 1_080_000,
    });
  });

  it('applies each env override independently', () => {
    expect(
      thresholdsFromEnv({
        ORDERS_PROCESSING_AFTER_MS: '5000',
        ORDERS_IN_TRANSIT_AFTER_MS: '10000',
        ORDERS_DELIVERED_AFTER_MS: '15000',
      }),
    ).toEqual({ processingAfterMs: 5_000, inTransitAfterMs: 10_000, deliveredAfterMs: 15_000 });
    expect(thresholdsFromEnv({ ORDERS_PROCESSING_AFTER_MS: '1000' }).inTransitAfterMs).toBe(
      360_000,
    );
  });

  it('falls back to defaults for garbage values', () => {
    expect(
      thresholdsFromEnv({ ORDERS_PROCESSING_AFTER_MS: 'soon', ORDERS_DELIVERED_AFTER_MS: '-5' }),
    ).toEqual(DEFAULT_THRESHOLDS);
  });
});

describe('statusIntervalFromEnv', () => {
  it('defaults to 30s', () => {
    expect(statusIntervalFromEnv({})).toBe(30_000);
  });

  it('is overridable', () => {
    expect(statusIntervalFromEnv({ ORDERS_STATUS_INTERVAL_MS: '3000' })).toBe(3_000);
  });
});
