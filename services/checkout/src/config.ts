/**
 * Checkout configuration — lives in code by design (the service is stateless).
 * Order-level promo, shipping and tax are owned here and nowhere else
 * (catalog owns unit prices and bulk tiers; see docs/CONTRACTS.md).
 */

import type { DeliveryMethod } from '@ruleprod/contracts';

export interface PromoDef {
  code: string;
  percentOff: number;
  /** Last day (UTC, inclusive) the code is valid; omitted = no expiry. */
  validThrough?: string;
  /** Minimum post-bulk subtotal (cents) required to apply; omitted = none. */
  minSubtotalCents?: number;
}

export const PROMOS: readonly PromoDef[] = [
  { code: 'SUMMER15', percentOff: 15, validThrough: '2026-08-31' },
  { code: 'WELCOME10', percentOff: 10, validThrough: '2026-05-31' },
  { code: 'TRADE20', percentOff: 20, minSubtotalCents: 50000 },
] as const;

export interface ShippingOption {
  priceCents: number;
  businessDays: number;
  /** Free when the post-bulk subtotal reaches this many cents; omitted = never free. */
  freeOverCents?: number;
}

export const SHIPPING: Readonly<Record<DeliveryMethod, ShippingOption>> = {
  standard: { priceCents: 650, businessDays: 4, freeOverCents: 7500 },
  expedited: { priceCents: 1800, businessDays: 2 },
} as const;

/** Sales tax: 8.875% of (subtotal − promo discount), rounded half-up. */
export const TAX_RATE = { numerator: 8875, denominator: 100_000 } as const;

/** Hard deadline on the orders write — the one write in the checkout path. */
export const ORDERS_TIMEOUT_MS = 5000;
