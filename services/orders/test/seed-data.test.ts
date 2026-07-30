import { describe, expect, it } from 'vitest';
import { PERSONAS, findPersona } from '@ruleprod/contracts';
import {
  SEED_ORDERS,
  SEED_RATES,
  deriveTotals,
  seedIdempotencyKey,
  seedOrderId,
} from '../src/seed-data.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** The live sequence starts here (see MIGRATION_SQL); seeds must stay below it. */
const SEQUENCE_START = 10517;

describe('seed order roster', () => {
  it('gives every persona history to show on the account page', () => {
    for (const persona of PERSONAS) {
      const mine = SEED_ORDERS.filter((order) => order.personaId === persona.id);
      expect(mine.length, `${persona.id} has no seeded orders`).toBeGreaterThanOrEqual(3);
    }
  });

  it('names only known personas', () => {
    for (const order of SEED_ORDERS) {
      expect(findPersona(order.personaId), order.orderNumber).toBeDefined();
    }
  });

  it('reserves order numbers below the live sequence', () => {
    for (const order of SEED_ORDERS) {
      expect(order.orderNumber).toMatch(/^RP-\d{5}$/);
      expect(Number(order.orderNumber.slice(3))).toBeLessThan(SEQUENCE_START);
    }
  });

  it('uses each order number, id and idempotency key exactly once', () => {
    const numbers = SEED_ORDERS.map((order) => order.orderNumber);
    expect(new Set(numbers).size).toBe(SEED_ORDERS.length);
    expect(new Set(numbers.map(seedOrderId)).size).toBe(SEED_ORDERS.length);
    expect(new Set(numbers.map(seedIdempotencyKey)).size).toBe(SEED_ORDERS.length);
  });

  it('derives ids Postgres will accept as uuids', () => {
    for (const order of SEED_ORDERS) {
      expect(seedOrderId(order.orderNumber)).toMatch(UUID_RE);
    }
  });

  it('is old enough that the status loop leaves it delivered', () => {
    for (const order of SEED_ORDERS) {
      // The loop delivers at 18 minutes; a day is the smallest gap we allow.
      expect(order.daysAgo, order.orderNumber).toBeGreaterThanOrEqual(1);
    }
  });

  it('orders at least one line, with sane quantities and prices', () => {
    for (const order of SEED_ORDERS) {
      expect(order.lines.length, order.orderNumber).toBeGreaterThan(0);
      for (const line of order.lines) {
        expect(line.qty).toBeGreaterThan(0);
        expect(line.unitPriceCents).toBeGreaterThan(0);
        if (line.baseUnitPriceCents !== undefined) {
          expect(line.baseUnitPriceCents).toBeGreaterThan(line.unitPriceCents);
        }
      }
    }
  });
});

describe('deriveTotals', () => {
  it('sums line totals into the subtotal', () => {
    for (const order of SEED_ORDERS) {
      const expected = order.lines.reduce((sum, l) => sum + l.unitPriceCents * l.qty, 0);
      expect(deriveTotals(order).subtotalCents, order.orderNumber).toBe(expected);
    }
  });

  it('balances: total = subtotal − promo + shipping + tax', () => {
    for (const order of SEED_ORDERS) {
      const t = deriveTotals(order);
      expect(t.totalCents, order.orderNumber).toBe(
        t.subtotalCents - t.promoDiscountCents + t.shippingCents + t.taxCents,
      );
    }
  });

  it('applies checkout shipping rates: free standard over the threshold', () => {
    for (const order of SEED_ORDERS) {
      const t = deriveTotals(order);
      if (order.delivery === 'expedited') {
        expect(t.shippingCents, order.orderNumber).toBe(SEED_RATES.expeditedShippingCents);
      } else if (t.subtotalCents >= SEED_RATES.standardFreeOverCents) {
        expect(t.shippingCents, order.orderNumber).toBe(0);
      } else {
        expect(t.shippingCents, order.orderNumber).toBe(SEED_RATES.standardShippingCents);
      }
    }
  });

  it('taxes the post-promo subtotal, rounded half-up', () => {
    for (const order of SEED_ORDERS) {
      const t = deriveTotals(order);
      const taxable = t.subtotalCents - t.promoDiscountCents;
      const exact = (taxable * SEED_RATES.taxNumerator) / SEED_RATES.taxDenominator;
      expect(t.taxCents, order.orderNumber).toBe(Math.round(exact));
    }
  });

  it('charges nothing extra when there is no promo', () => {
    for (const order of SEED_ORDERS.filter((o) => o.promo === undefined)) {
      expect(deriveTotals(order).promoDiscountCents, order.orderNumber).toBe(0);
    }
  });

  it('counts bulk savings only where a tier beat the list price', () => {
    for (const order of SEED_ORDERS) {
      const expected = order.lines.reduce(
        (sum, l) =>
          l.baseUnitPriceCents === undefined
            ? sum
            : sum + (l.baseUnitPriceCents - l.unitPriceCents) * l.qty,
        0,
      );
      expect(deriveTotals(order).bulkSavingsCents, order.orderNumber).toBe(expected);
    }
  });
});
