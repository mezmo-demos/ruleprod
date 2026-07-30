import { describe, expect, it } from 'vitest';
import { toCard, type CardRow } from '../src/routes/products.js';
import { saleAdjustedUnitCents } from '../src/pricing.js';

/**
 * `salePercentOff` arrives from pg as a *string* (numeric(5,2)), not a number.
 * These tests pin that conversion, because a silent NaN here would put
 * "$NaN" on every card of a discounted product.
 */

const BASE_ROW: CardRow = {
  slug: 'precision-steel-rule-6',
  title: 'Precision steel rule',
  specLine: 'Stainless steel · 4R graduation · satin chrome',
  image: 'prod-steel-rule',
  badge: null,
  priceCents: 3400,
  stock: 412,
  bulkMinQty: 10,
  bulkUnitPriceCents: 3060,
  salePercentOff: null,
};

describe('toCard', () => {
  it('leaves the price alone and reports no sale when no window is open', () => {
    const card = toCard(BASE_ROW);
    expect(card.priceCents).toBe(3400);
    expect(card.sale).toBeNull();
  });

  it('discounts the price and reports the pre-sale price when a sale is open', () => {
    const card = toCard({ ...BASE_ROW, salePercentOff: '15.00' });
    expect(card.priceCents).toBe(2890);
    expect(card.sale).toEqual({ percentOff: 15, basePriceCents: 3400 });
  });

  it('parses the numeric string pg returns rather than producing NaN', () => {
    const card = toCard({ ...BASE_ROW, salePercentOff: '7.50' });
    expect(Number.isNaN(card.priceCents)).toBe(false);
    expect(card.sale?.percentOff).toBe(7.5);
    expect(card.priceCents).toBe(saleAdjustedUnitCents(3400, 7.5));
  });

  it('rounds the discounted price exactly as a quote would', () => {
    // Same input the checkout path prices, so browse and checkout agree.
    for (const [base, pct] of [
      [3400, 15],
      [380, 15],
      [240, 15],
      [1850, 20],
    ] as const) {
      const card = toCard({ ...BASE_ROW, priceCents: base, salePercentOff: String(pct) });
      expect(card.priceCents).toBe(saleAdjustedUnitCents(base, pct));
    }
  });

  it('keeps the bulk teaser at its own price, untouched by the sale', () => {
    // Tiers are absolute prices, not percentages off — a sale must not restate them.
    const card = toCard({ ...BASE_ROW, salePercentOff: '15.00' });
    expect(card.bulk).toEqual({ minQty: 10, unitPriceCents: 3060 });
  });

  it('reports no bulk teaser when the product has no tiers', () => {
    const card = toCard({ ...BASE_ROW, bulkMinQty: null, bulkUnitPriceCents: null });
    expect(card.bulk).toBeNull();
  });

  it('carries the badge through only when there is one', () => {
    expect(toCard(BASE_ROW).badge).toBeUndefined();
    expect(toCard({ ...BASE_ROW, badge: 'best_seller' }).badge).toBe('best_seller');
  });
});
