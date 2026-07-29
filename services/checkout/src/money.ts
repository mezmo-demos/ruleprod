/** Integer-exact money arithmetic. All amounts are USD cents (see CONTRACTS.md). */

import { TAX_RATE } from './config.js';

/**
 * Round-half-up integer division: round(numerator / denominator) for
 * non-negative integers, with no floating-point drift.
 * floor((2n + d) / 2d) rounds .5 exactly upward for any positive denominator.
 */
export function divRoundHalfUp(numerator: number, denominator: number): number {
  return Math.floor((2 * numerator + denominator) / (2 * denominator));
}

/** Promo discount: percentOff% of the subtotal, rounded half-up. */
export function percentDiscountCents(subtotalCents: number, percentOff: number): number {
  return divRoundHalfUp(subtotalCents * percentOff, 100);
}

/** Tax on (subtotal − promo discount), rounded half-up. */
export function taxCentsOn(taxableCents: number): number {
  return divRoundHalfUp(taxableCents * TAX_RATE.numerator, TAX_RATE.denominator);
}

/** 50000 → "$500.00" — for user-facing promo messages. */
export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** '2026-05-31' → '31 May 2026' (UTC) — for user-facing expiry messages. */
export function formatDayUTC(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
