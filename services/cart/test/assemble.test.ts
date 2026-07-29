import { describe, expect, it } from 'vitest';
import { assembleCart } from '../src/logic/assemble.js';
import { line, quote, quotedLine } from './fixtures.js';

describe('assembleCart (quote-join)', () => {
  it('joins quote lines onto stored lines by sku, adding id and addedAt', () => {
    const stored = line({ sku: 'RP-SR-6R4', qty: 12, addedAt: '2026-07-10T09:00:00.000Z' });
    const q = quote([quotedLine('RP-SR-6R4', 12, 3060)], 4080);

    const cart = assembleCart('anon:abc', [stored], [], q, null);

    expect(cart.key).toBe('anon:abc');
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]).toMatchObject({
      id: stored.id,
      addedAt: stored.addedAt,
      sku: 'RP-SR-6R4',
      qty: 12,
      unitPriceCents: 3060,
      lineTotalCents: 36720,
    });
    expect(cart.unitCount).toBe(12);
    expect(cart.subtotalCents).toBe(36720);
    expect(cart.bulkSavingsCents).toBe(4080);
  });

  it('preserves stored line order regardless of quote order', () => {
    const a = line({ sku: 'A', qty: 1 });
    const b = line({ sku: 'B', qty: 2 });
    const q = quote([quotedLine('B', 2, 100), quotedLine('A', 1, 200)]);

    const cart = assembleCart('k', [a, b], [], q, null);
    expect(cart.lines.map((l) => l.sku)).toEqual(['A', 'B']);
  });

  it('prices saved-for-later lines but excludes them from counts and totals', () => {
    const active = line({ sku: 'A', qty: 2 });
    const saved = line({ sku: 'B', qty: 9, savedForLater: true });
    const activeQuote = quote([quotedLine('A', 2, 500)]);
    const savedQuote = quote([quotedLine('B', 9, 700)]);

    const cart = assembleCart('k', [active], [saved], activeQuote, savedQuote);

    expect(cart.savedForLater).toHaveLength(1);
    expect(cart.savedForLater[0]).toMatchObject({ sku: 'B', unitPriceCents: 700, id: saved.id });
    // Totals cover active lines only.
    expect(cart.unitCount).toBe(2);
    expect(cart.subtotalCents).toBe(1000);
    expect(cart.bulkSavingsCents).toBe(0);
  });

  it('skips stored lines missing from the quote (dropped unknown skus)', () => {
    const known = line({ sku: 'A', qty: 1 });
    const unknown = line({ sku: 'GONE', qty: 5 });
    const q = quote([quotedLine('A', 1, 100)]);

    const cart = assembleCart('k', [known, unknown], [], q, null);
    expect(cart.lines.map((l) => l.sku)).toEqual(['A']);
  });

  it('returns an empty cart shape when there is nothing to quote', () => {
    expect(assembleCart('k', [], [], null, null)).toEqual({
      key: 'k',
      lines: [],
      savedForLater: [],
      unitCount: 0,
      subtotalCents: 0,
      bulkSavingsCents: 0,
    });
  });
});
