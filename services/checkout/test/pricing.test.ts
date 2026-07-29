import { describe, expect, it } from 'vitest';
import type { Cart, CartLine } from '@ruleprod/contracts';
import { divRoundHalfUp, taxCentsOn } from '../src/money.js';
import { buildQuote, shippingCentsFor } from '../src/pricing.js';

const NOW = new Date('2026-07-29T12:00:00Z');

function line(overrides: Partial<CartLine> = {}): CartLine {
  return {
    id: 'line-1',
    addedAt: '2026-07-28T09:00:00.000Z',
    sku: 'RP-SR-6R4',
    qty: 12,
    stock: 412,
    product: {
      slug: 'precision-steel-rule-6',
      title: 'Precision Steel Rule — 6 in',
      variantLabel: '6 in',
      specLine: '4R graduation · stainless',
      image: 'prod-steel-rule',
    },
    baseUnitPriceCents: 3400,
    unitPriceCents: 3060,
    lineTotalCents: 36720,
    appliedTier: { minQty: 10, unitPriceCents: 3060 },
    nextTier: { minQty: 25, unitPriceCents: 2720, unitsAway: 13 },
    ...overrides,
  };
}

function cartOf(lines: CartLine[]): Cart {
  return {
    key: 'anon:abc',
    lines,
    savedForLater: [],
    unitCount: lines.reduce((sum, l) => sum + l.qty, 0),
    subtotalCents: lines.reduce((sum, l) => sum + l.lineTotalCents, 0),
    bulkSavingsCents: lines.reduce(
      (sum, l) => sum + (l.baseUnitPriceCents - l.unitPriceCents) * l.qty,
      0,
    ),
  };
}

describe('divRoundHalfUp', () => {
  it('rounds exact halves upward', () => {
    expect(divRoundHalfUp(5, 2)).toBe(3); // 2.5 → 3
    expect(divRoundHalfUp(450, 100)).toBe(5); // 4.5 → 5
  });

  it('rounds fractions below one half downward', () => {
    expect(divRoundHalfUp(449, 100)).toBe(4); // 4.49 → 4
  });
});

describe('shippingCentsFor', () => {
  it('charges $6.50 standard at $74.99 post-bulk subtotal', () => {
    expect(shippingCentsFor('standard', 7499)).toBe(650);
  });

  it('is free standard at exactly $75.00 post-bulk subtotal', () => {
    expect(shippingCentsFor('standard', 7500)).toBe(0);
  });

  it('never discounts expedited', () => {
    expect(shippingCentsFor('expedited', 7499)).toBe(1800);
    expect(shippingCentsFor('expedited', 1_000_000)).toBe(1800);
  });
});

describe('taxCentsOn', () => {
  it('rounds half-up on real cent values', () => {
    expect(taxCentsOn(10000)).toBe(888); // 887.5 → 888
    expect(taxCentsOn(400)).toBe(36); // 35.5 → 36
    expect(taxCentsOn(104)).toBe(9); // 9.23 → 9
    expect(taxCentsOn(0)).toBe(0);
  });
});

describe('buildQuote', () => {
  it('assembles the full quote for a bulk cart with SUMMER15 and free shipping', () => {
    const quote = buildQuote(cartOf([line()]), 'standard', 'SUMMER15', NOW);
    expect(quote.subtotalCents).toBe(36720);
    expect(quote.bulkSavingsCents).toBe(4080);
    expect(quote.unitCount).toBe(12);
    expect(quote.promo).toEqual({ code: 'SUMMER15', discountCents: 5508 });
    expect(quote.promoError).toBeUndefined();
    expect(quote.shippingCents).toBe(0); // 36720 ≥ 7500 → free standard
    expect(quote.taxCents).toBe(2770); // 8.875% of 31212 = 2770.065 → 2770
    expect(quote.totalCents).toBe(33982); // 36720 − 5508 + 0 + 2770
  });

  it('adds standard shipping below the free threshold and taxes the promo-reduced subtotal', () => {
    const cart = cartOf([
      line({ qty: 1, unitPriceCents: 7499, baseUnitPriceCents: 7499, lineTotalCents: 7499, appliedTier: null, nextTier: null }),
    ]);
    const quote = buildQuote(cart, 'standard', undefined, NOW);
    expect(quote.promo).toBeNull();
    expect(quote.shippingCents).toBe(650);
    expect(quote.taxCents).toBe(666); // 8.875% of 7499 = 665.536… → 666
    expect(quote.totalCents).toBe(7499 + 650 + 666);
  });

  it('prices expedited delivery at $18.00 regardless of subtotal', () => {
    const quote = buildQuote(cartOf([line()]), 'expedited', undefined, NOW);
    expect(quote.shippingCents).toBe(1800);
    expect(quote.totalCents).toBe(36720 + 1800 + taxCentsOn(36720));
  });

  it('reports a failed promo as promo: null plus promoError, still computing totals', () => {
    const quote = buildQuote(cartOf([line()]), 'standard', 'WELCOME10', NOW);
    expect(quote.promo).toBeNull();
    expect(quote.promoError).toEqual({
      code: 'promo_expired',
      message: 'WELCOME10 expired on 31 May 2026.',
    });
    expect(quote.taxCents).toBe(taxCentsOn(36720)); // no discount applied
    expect(quote.totalCents).toBe(36720 + 0 + taxCentsOn(36720));
  });

  it('strips cart-only fields so lines are exactly the contract QuotedLine', () => {
    const quote = buildQuote(cartOf([line()]), 'standard', undefined, NOW);
    expect(quote.lines).toHaveLength(1);
    expect(quote.lines[0]).not.toHaveProperty('id');
    expect(quote.lines[0]).not.toHaveProperty('addedAt');
    expect(quote.lines[0]).toMatchObject({ sku: 'RP-SR-6R4', qty: 12, lineTotalCents: 36720 });
  });

  it('omits promoError entirely when no code was supplied', () => {
    const quote = buildQuote(cartOf([line()]), 'standard', undefined, NOW);
    expect('promoError' in quote).toBe(false);
  });
});
