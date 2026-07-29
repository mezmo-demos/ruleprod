import type { PriceQuote, QuotedLine } from '@ruleprod/contracts';
import type { StoredLine } from '../src/types.js';

let seq = 0;

export function line(overrides: Partial<StoredLine> = {}): StoredLine {
  seq += 1;
  return {
    id: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
    sku: 'RP-SR-6R4',
    qty: 1,
    savedForLater: false,
    addedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

export function quotedLine(sku: string, qty: number, unitPriceCents: number): QuotedLine {
  return {
    sku,
    qty,
    stock: 412,
    product: {
      slug: 'precision-steel-rule-6',
      title: 'Precision steel rule',
      variantLabel: '6 in',
      specLine: 'Stainless · 4R',
      image: 'prod-steel-rule',
    },
    baseUnitPriceCents: 3400,
    unitPriceCents,
    lineTotalCents: unitPriceCents * qty,
    appliedTier: null,
    nextTier: null,
  };
}

export function quote(lines: QuotedLine[], bulkSavingsCents = 0): PriceQuote {
  return {
    lines,
    subtotalCents: lines.reduce((sum, l) => sum + l.lineTotalCents, 0),
    bulkSavingsCents,
    unitCount: lines.reduce((sum, l) => sum + l.qty, 0),
  };
}
