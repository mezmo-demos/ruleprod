import { describe, expect, it } from 'vitest';
import type { BulkTier } from '@ruleprod/contracts';
import {
  activeSalePercent,
  isSaleActive,
  priceLine,
  roundHalfUp,
  saleAdjustedUnitCents,
  selectTier,
  sortTiers,
  summarize,
} from '../src/pricing.js';

/** The hero product's 6-in ladder from CONTRACTS.md. */
const HERO_BASE = 3400;
const HERO_TIERS: BulkTier[] = [
  { minQty: 10, unitPriceCents: 3060 },
  { minQty: 25, unitPriceCents: 2720 },
  { minQty: 100, unitPriceCents: 2380 },
];

describe('roundHalfUp', () => {
  it('rounds .5 up and everything else to nearest', () => {
    expect(roundHalfUp(2.5)).toBe(3);
    expect(roundHalfUp(2.4)).toBe(2);
    expect(roundHalfUp(2.6)).toBe(3);
    expect(roundHalfUp(0)).toBe(0);
    expect(roundHalfUp(297.5)).toBe(298);
  });
});

describe('saleAdjustedUnitCents', () => {
  it('returns the base price when there is no sale', () => {
    expect(saleAdjustedUnitCents(HERO_BASE, 0)).toBe(HERO_BASE);
  });

  it('applies integer percents exactly', () => {
    expect(saleAdjustedUnitCents(3400, 15)).toBe(2890);
    expect(saleAdjustedUnitCents(3400, 10)).toBe(3060);
    expect(saleAdjustedUnitCents(380, 15)).toBe(323);
  });

  it('rounds half-up on exact halves', () => {
    // 350 * 0.85 = 297.5 -> 298
    expect(saleAdjustedUnitCents(350, 15)).toBe(298);
    // 250 * 0.99 = 247.5 -> 248
    expect(saleAdjustedUnitCents(250, 1)).toBe(248);
  });

  it('rounds to nearest for non-half fractions', () => {
    // 333 * 0.9 = 299.7 -> 300
    expect(saleAdjustedUnitCents(333, 10)).toBe(300);
    // 101 * 0.85 = 85.85 -> 86
    expect(saleAdjustedUnitCents(101, 15)).toBe(86);
  });

  it('handles fractional percents via basis points', () => {
    // 1000 * (1 - 0.125) = 875
    expect(saleAdjustedUnitCents(1000, 12.5)).toBe(875);
  });
});

describe('sale windows', () => {
  const sale = { percentOff: 15, startsAt: '2026-07-01T00:00:00Z', endsAt: '2026-09-01T00:00:00Z' };

  it('is inactive before the start', () => {
    expect(isSaleActive(sale, new Date('2026-06-30T23:59:59Z'))).toBe(false);
  });

  it('is active exactly at the start (inclusive)', () => {
    expect(isSaleActive(sale, new Date('2026-07-01T00:00:00Z'))).toBe(true);
  });

  it('is active mid-window', () => {
    expect(isSaleActive(sale, new Date('2026-07-29T12:00:00Z'))).toBe(true);
  });

  it('is inactive exactly at the end (exclusive)', () => {
    expect(isSaleActive(sale, new Date('2026-09-01T00:00:00Z'))).toBe(false);
  });

  it('activeSalePercent picks the biggest active window and ignores inactive ones', () => {
    const now = new Date('2026-07-15T00:00:00Z');
    const windows = [
      sale,
      { percentOff: 30, startsAt: '2026-01-01T00:00:00Z', endsAt: '2026-02-01T00:00:00Z' },
      { percentOff: 20, startsAt: '2026-07-10T00:00:00Z', endsAt: '2026-07-20T00:00:00Z' },
    ];
    expect(activeSalePercent(windows, now)).toBe(20);
    expect(activeSalePercent([], now)).toBe(0);
  });
});

describe('selectTier', () => {
  it('sorts tiers before selecting', () => {
    const shuffled = [HERO_TIERS[2]!, HERO_TIERS[0]!, HERO_TIERS[1]!];
    expect(sortTiers(shuffled).map((t) => t.minQty)).toEqual([10, 25, 100]);
    expect(selectTier(shuffled, 26).applied?.minQty).toBe(25);
  });

  it('applies no tier below the first threshold', () => {
    const { applied, next } = selectTier(HERO_TIERS, 9);
    expect(applied).toBeNull();
    expect(next).toEqual({ minQty: 10, unitPriceCents: 3060, unitsAway: 1 });
  });

  it('applies the tier exactly at its threshold', () => {
    const { applied, next } = selectTier(HERO_TIERS, 10);
    expect(applied).toEqual({ minQty: 10, unitPriceCents: 3060 });
    expect(next).toEqual({ minQty: 25, unitPriceCents: 2720, unitsAway: 15 });
  });

  it('holds the tier through the band and rolls at the next threshold', () => {
    expect(selectTier(HERO_TIERS, 24).applied?.unitPriceCents).toBe(3060);
    expect(selectTier(HERO_TIERS, 25).applied?.unitPriceCents).toBe(2720);
    expect(selectTier(HERO_TIERS, 99).applied?.unitPriceCents).toBe(2720);
    expect(selectTier(HERO_TIERS, 100).applied?.unitPriceCents).toBe(2380);
  });

  it('has no next tier above the top band', () => {
    const { applied, next } = selectTier(HERO_TIERS, 250);
    expect(applied?.minQty).toBe(100);
    expect(next).toBeNull();
  });

  it('handles empty tier lists', () => {
    expect(selectTier([], 50)).toEqual({ applied: null, next: null });
  });
});

describe('priceLine', () => {
  it('quotes the design PDP moment: qty 12 at the 10+ break', () => {
    const line = priceLine({ qty: 12, baseUnitPriceCents: HERO_BASE, tiers: HERO_TIERS });
    expect(line.baseUnitPriceCents).toBe(3400);
    expect(line.unitPriceCents).toBe(3060);
    expect(line.lineTotalCents).toBe(36_720); // "Add to cart · $367.20"
    expect(line.bulkSavingsCents).toBe(4_080); // "you save $40.80"
    expect(line.appliedTier).toEqual({ minQty: 10, unitPriceCents: 3060 });
    expect(line.nextTier).toEqual({ minQty: 25, unitPriceCents: 2720, unitsAway: 13 });
  });

  it('quotes base price with no tier applied below the break', () => {
    const line = priceLine({ qty: 9, baseUnitPriceCents: HERO_BASE, tiers: HERO_TIERS });
    expect(line.unitPriceCents).toBe(3400);
    expect(line.lineTotalCents).toBe(30_600);
    expect(line.appliedTier).toBeNull();
    expect(line.bulkSavingsCents).toBe(0);
  });

  it('applies the sale to the base BEFORE tiers', () => {
    // 15% sale: base 3400 -> 2890. The 10+ tier (3060) is now worse than the
    // sale price, so it must NOT apply.
    const line = priceLine({
      qty: 12,
      baseUnitPriceCents: HERO_BASE,
      tiers: HERO_TIERS,
      salePercentOff: 15,
    });
    expect(line.baseUnitPriceCents).toBe(2890);
    expect(line.appliedTier).toBeNull();
    expect(line.unitPriceCents).toBe(2890);
    expect(line.bulkSavingsCents).toBe(0);
  });

  it('still applies a tier that beats the sale-adjusted base', () => {
    // 15% sale: base 2890; the 25+ tier at 2720 still wins.
    const line = priceLine({
      qty: 30,
      baseUnitPriceCents: HERO_BASE,
      tiers: HERO_TIERS,
      salePercentOff: 15,
    });
    expect(line.baseUnitPriceCents).toBe(2890);
    expect(line.appliedTier).toEqual({ minQty: 25, unitPriceCents: 2720 });
    expect(line.unitPriceCents).toBe(2720);
    // Bulk savings measure tier savings vs the SALE-ADJUSTED base.
    expect(line.bulkSavingsCents).toBe((2890 - 2720) * 30);
  });

  it('quotes a plain sale line with no tiers', () => {
    const line = priceLine({ qty: 4, baseUnitPriceCents: 380, tiers: [], salePercentOff: 15 });
    expect(line.baseUnitPriceCents).toBe(323);
    expect(line.unitPriceCents).toBe(323);
    expect(line.lineTotalCents).toBe(1292);
    expect(line.appliedTier).toBeNull();
    expect(line.nextTier).toBeNull();
    expect(line.bulkSavingsCents).toBe(0);
  });
});

describe('summarize', () => {
  it('sums subtotal, savings and units across lines', () => {
    const a = priceLine({ qty: 12, baseUnitPriceCents: HERO_BASE, tiers: HERO_TIERS });
    const b = priceLine({ qty: 2, baseUnitPriceCents: 2400, tiers: [] });
    const totals = summarize([
      { pricing: a, qty: 12 },
      { pricing: b, qty: 2 },
    ]);
    expect(totals.subtotalCents).toBe(36_720 + 4_800);
    expect(totals.bulkSavingsCents).toBe(4_080);
    expect(totals.unitCount).toBe(14);
  });

  it('returns zeros for no lines', () => {
    expect(summarize([])).toEqual({ subtotalCents: 0, bulkSavingsCents: 0, unitCount: 0 });
  });
});
