import { describe, expect, it } from 'vitest';
import { AppError } from '../src/errors.js';
import {
  extractUnknownSkus,
  priceLines,
  type QuoteFn,
  type QuoteResult,
} from '../src/logic/pricing.js';
import { quote, quotedLine } from './fixtures.js';

function fakeQuote(responses: QuoteResult[]): { fn: QuoteFn; calls: { sku: string; qty: number }[][] } {
  const calls: { sku: string; qty: number }[][] = [];
  const fn: QuoteFn = async (lines) => {
    calls.push(lines);
    const next = responses.shift();
    if (!next) throw new Error('fake quote fn called more times than expected');
    return next;
  };
  return { fn, calls };
}

describe('extractUnknownSkus', () => {
  it('finds which of our skus a catalog message names', () => {
    expect(extractUnknownSkus('Unknown sku: RP-XX-1', ['RP-SR-6R4', 'RP-XX-1'])).toEqual([
      'RP-XX-1',
    ]);
  });

  it('returns empty when the message names none of our skus', () => {
    expect(extractUnknownSkus('lines must not be empty', ['RP-SR-6R4'])).toEqual([]);
  });
});

describe('priceLines (drop-unknown-sku path)', () => {
  it('returns the quote and no drops on first success', async () => {
    const q = quote([quotedLine('A', 2, 100)]);
    const { fn, calls } = fakeQuote([{ ok: true, quote: q }]);

    const result = await priceLines([{ sku: 'A', qty: 2 }], fn);

    expect(result).toEqual({ quote: q, dropped: [] });
    expect(calls).toEqual([[{ sku: 'A', qty: 2 }]]);
  });

  it('drops the sku catalog rejects and re-quotes the remainder', async () => {
    const requote = quote([quotedLine('A', 2, 100)]);
    const { fn, calls } = fakeQuote([
      { ok: false, code: 'invalid_request', message: 'Unknown sku: GONE' },
      { ok: true, quote: requote },
    ]);

    const result = await priceLines(
      [
        { sku: 'A', qty: 2 },
        { sku: 'GONE', qty: 5 },
      ],
      fn,
    );

    expect(result.dropped).toEqual(['GONE']);
    expect(result.quote).toBe(requote);
    expect(calls[1]).toEqual([{ sku: 'A', qty: 2 }]);
  });

  it('handles every line being unknown, without a final empty-quote call', async () => {
    const { fn, calls } = fakeQuote([
      { ok: false, code: 'invalid_request', message: 'Unknown skus: GONE-1, GONE-2' },
    ]);

    const result = await priceLines(
      [
        { sku: 'GONE-1', qty: 1 },
        { sku: 'GONE-2', qty: 2 },
      ],
      fn,
    );

    expect(result).toEqual({ quote: null, dropped: ['GONE-1', 'GONE-2'] });
    expect(calls).toHaveLength(1);
  });

  it('never calls the quote fn for an empty line set', async () => {
    const { fn, calls } = fakeQuote([]);
    const result = await priceLines([], fn);
    expect(result).toEqual({ quote: null, dropped: [] });
    expect(calls).toHaveLength(0);
  });

  it('throws upstream_error when invalid_request names no known sku', async () => {
    const { fn } = fakeQuote([
      { ok: false, code: 'invalid_request', message: 'lines must not be empty' },
    ]);

    await expect(priceLines([{ sku: 'A', qty: 1 }], fn)).rejects.toMatchObject({
      code: 'upstream_error',
      statusCode: 502,
    });
  });

  it('throws upstream_error for any other catalog rejection', async () => {
    const { fn } = fakeQuote([{ ok: false, code: 'conflict', message: 'nope' }]);

    await expect(priceLines([{ sku: 'A', qty: 1 }], fn)).rejects.toBeInstanceOf(AppError);
  });

  it('propagates transport failures from the quote fn (catalog unreachable)', async () => {
    const fn: QuoteFn = async () => {
      throw new AppError('upstream_error', 'catalog is unreachable: fetch failed');
    };

    await expect(priceLines([{ sku: 'A', qty: 1 }], fn)).rejects.toMatchObject({
      code: 'upstream_error',
      statusCode: 502,
    });
  });
});
