/**
 * Quote-join: stored lines (sku/qty/id/addedAt) + catalog quotes → the Cart
 * response shape. Counts and totals cover active lines only; saved-for-later
 * lines carry prices but never contribute to unitCount/subtotal/bulkSavings.
 */
import type { Cart, CartLine, PriceQuote } from '@ruleprod/contracts';
import type { StoredLine } from '../types.js';

function joinLines(stored: readonly StoredLine[], quote: PriceQuote | null): CartLine[] {
  if (!quote) return [];
  const bySku = new Map(quote.lines.map((l) => [l.sku, l]));
  const out: CartLine[] = [];
  for (const line of stored) {
    const quoted = bySku.get(line.sku);
    if (!quoted) continue; // dropped as unknown — already deleted by the caller
    out.push({ ...quoted, id: line.id, addedAt: line.addedAt });
  }
  return out;
}

export function assembleCart(
  key: string,
  active: readonly StoredLine[],
  saved: readonly StoredLine[],
  activeQuote: PriceQuote | null,
  savedQuote: PriceQuote | null,
): Cart {
  return {
    key,
    lines: joinLines(active, activeQuote),
    savedForLater: joinLines(saved, savedQuote),
    unitCount: activeQuote?.unitCount ?? 0,
    subtotalCents: activeQuote?.subtotalCents ?? 0,
    bulkSavingsCents: activeQuote?.bulkSavingsCents ?? 0,
  };
}
