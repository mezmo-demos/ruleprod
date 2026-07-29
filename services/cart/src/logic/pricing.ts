/**
 * Pricing orchestration. Cart never computes a price — it sends stored
 * sku/qty pairs to catalog's price-quote and reacts to the result. The quote
 * function is injected so this module stays free of network concerns.
 */
import type { PriceQuote } from '@ruleprod/contracts';
import { AppError } from '../errors.js';
import type { SnapshotLine } from '../types.js';

export type QuoteResult =
  | { ok: true; quote: PriceQuote }
  | { ok: false; code: string; message: string };

export type QuoteFn = (lines: SnapshotLine[]) => Promise<QuoteResult>;

/** Which of our stored skus does a catalog invalid_request message name? */
export function extractUnknownSkus(message: string, skus: readonly string[]): string[] {
  return skus.filter((sku) => message.includes(sku));
}

export interface PricedLines {
  /** Null when there was nothing to quote (or every line was dropped). */
  quote: PriceQuote | null;
  /** Skus catalog no longer knows — the caller must delete them and log. */
  dropped: string[];
}

/**
 * Quote a set of lines. If catalog rejects a sku as unknown (seed changed),
 * drop it and re-quote the remainder; anything else from catalog is a 502
 * upstream_error. Never calls the quote function with an empty line set.
 */
export async function priceLines(
  lines: readonly SnapshotLine[],
  quote: QuoteFn,
): Promise<PricedLines> {
  const dropped: string[] = [];
  let current = lines.map(({ sku, qty }) => ({ sku, qty }));
  while (current.length > 0) {
    const result = await quote(current);
    if (result.ok) return { quote: result.quote, dropped };
    if (result.code !== 'invalid_request') {
      throw new AppError('upstream_error', `catalog price-quote failed: ${result.message}`);
    }
    const unknown = extractUnknownSkus(
      result.message,
      current.map((l) => l.sku),
    );
    if (unknown.length === 0) {
      // invalid_request we cannot attribute to a sku — nothing safe to drop.
      throw new AppError('upstream_error', `catalog rejected price-quote: ${result.message}`);
    }
    dropped.push(...unknown);
    current = current.filter((l) => !unknown.includes(l.sku));
  }
  return { quote: null, dropped };
}
