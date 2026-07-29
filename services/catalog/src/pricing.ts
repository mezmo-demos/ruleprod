/**
 * Pure pricing logic — the single home of unit-price arithmetic for the whole
 * system (cart and checkout consume it via POST /api/price-quote).
 *
 * Rules, in order:
 *   1. An active sale window discounts the variant's base price (round half-up).
 *   2. The best qualifying bulk tier (qty >= minQty) replaces the unit price,
 *      but only when it actually beats the sale-adjusted base.
 *
 * `baseUnitPriceCents` on a quoted line is the *sale-adjusted* base, so
 * (baseUnitPriceCents - unitPriceCents) * qty is exactly the line's bulk
 * savings — tier savings measured against the sale-adjusted base.
 */

import type { BulkTier } from '@ruleprod/contracts';

export interface SaleWindow {
  percentOff: number;
  /** Inclusive start (ISO string or Date). */
  startsAt: string | Date;
  /** Exclusive end (ISO string or Date). */
  endsAt: string | Date;
}

export interface LinePricingInput {
  qty: number;
  /** Variant base price before any sale or tier. */
  baseUnitPriceCents: number;
  /** Bulk tiers for the sku, any order. */
  tiers: readonly BulkTier[];
  /** Active sale percent off (0 when no sale). */
  salePercentOff?: number;
}

export interface LinePricing {
  /** Sale-adjusted base unit price (what one unit costs without bulk). */
  baseUnitPriceCents: number;
  unitPriceCents: number;
  lineTotalCents: number;
  appliedTier: BulkTier | null;
  nextTier: (BulkTier & { unitsAway: number }) | null;
  /** (baseUnitPriceCents - unitPriceCents) * qty, never negative. */
  bulkSavingsCents: number;
}

/** Round half-up to the nearest integer; money is never negative here. */
export function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5);
}

/** Is `now` inside [startsAt, endsAt)? Start inclusive, end exclusive. */
export function isSaleActive(sale: SaleWindow, now: Date): boolean {
  const start = new Date(sale.startsAt).getTime();
  const end = new Date(sale.endsAt).getTime();
  const t = now.getTime();
  return t >= start && t < end;
}

/** Largest active percent-off among the windows; 0 when none is active. */
export function activeSalePercent(sales: readonly SaleWindow[], now: Date): number {
  let best = 0;
  for (const sale of sales) {
    if (isSaleActive(sale, now) && sale.percentOff > best) {
      best = sale.percentOff;
    }
  }
  return best;
}

/**
 * Apply a percent-off to a price in cents, rounding half-up.
 * Exact integer arithmetic in basis points, so 15% of 3400 is precisely 2890.
 */
export function saleAdjustedUnitCents(baseCents: number, percentOff: number): number {
  if (percentOff <= 0) return baseCents;
  const basisPoints = Math.round(percentOff * 100);
  return Math.floor((baseCents * (10_000 - basisPoints) + 5_000) / 10_000);
}

/** Tiers sorted by ascending minQty. */
export function sortTiers(tiers: readonly BulkTier[]): BulkTier[] {
  return [...tiers].sort((a, b) => a.minQty - b.minQty);
}

/**
 * Pick the qualifying tier (qty >= minQty) with the lowest unit price
 * (ties -> highest minQty), and the next tier up with its distance.
 */
export function selectTier(
  tiers: readonly BulkTier[],
  qty: number,
): { applied: BulkTier | null; next: (BulkTier & { unitsAway: number }) | null } {
  const sorted = sortTiers(tiers);
  let applied: BulkTier | null = null;
  let next: (BulkTier & { unitsAway: number }) | null = null;
  for (const tier of sorted) {
    if (tier.minQty <= qty) {
      if (applied === null || tier.unitPriceCents <= applied.unitPriceCents) {
        applied = tier;
      }
    } else if (next === null) {
      next = { ...tier, unitsAway: tier.minQty - qty };
    }
  }
  return { applied, next };
}

/** Price a single quote line. Pure; callers pass the active sale percent. */
export function priceLine(input: LinePricingInput): LinePricing {
  const saleBase = saleAdjustedUnitCents(input.baseUnitPriceCents, input.salePercentOff ?? 0);
  const { applied, next } = selectTier(input.tiers, input.qty);

  // A tier only applies when it beats the sale-adjusted base price.
  const appliedTier = applied !== null && applied.unitPriceCents < saleBase ? applied : null;
  const unitPriceCents = appliedTier ? appliedTier.unitPriceCents : saleBase;
  const lineTotalCents = unitPriceCents * input.qty;
  const bulkSavingsCents = Math.max(0, (saleBase - unitPriceCents) * input.qty);

  return {
    baseUnitPriceCents: saleBase,
    unitPriceCents,
    lineTotalCents,
    appliedTier,
    nextTier: next,
    bulkSavingsCents,
  };
}

export interface QuoteTotals {
  subtotalCents: number;
  bulkSavingsCents: number;
  unitCount: number;
}

/** Sum totals over priced lines. */
export function summarize(lines: readonly { pricing: LinePricing; qty: number }[]): QuoteTotals {
  let subtotalCents = 0;
  let bulkSavingsCents = 0;
  let unitCount = 0;
  for (const line of lines) {
    subtotalCents += line.pricing.lineTotalCents;
    bulkSavingsCents += line.pricing.bulkSavingsCents;
    unitCount += line.qty;
  }
  return { subtotalCents, bulkSavingsCents, unitCount };
}
