/**
 * HTTP client for catalog's POST /api/price-quote, shaped as the QuoteFn the
 * pricing module expects. Unreachable / 5xx catalog → 502 upstream_error;
 * 4xx responses are returned for the pricing loop to interpret.
 */
import type { PriceQuote } from '@ruleprod/contracts';
import { AppError } from './errors.js';
import type { QuoteFn } from './logic/pricing.js';

const QUOTE_TIMEOUT_MS = 5_000;

export function makeQuoteFn(catalogBaseUrl: string, fetchImpl: typeof fetch = fetch): QuoteFn {
  const url = `${catalogBaseUrl.replace(/\/+$/, '')}/api/price-quote`;
  return async (lines) => {
    let res: Response;
    try {
      res = await fetchImpl(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lines }),
        signal: AbortSignal.timeout(QUOTE_TIMEOUT_MS),
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new AppError('upstream_error', `catalog is unreachable: ${reason}`);
    }
    if (res.ok) {
      try {
        return { ok: true, quote: (await res.json()) as PriceQuote };
      } catch {
        throw new AppError('upstream_error', 'catalog returned a malformed price-quote');
      }
    }
    let code = 'upstream_error';
    let message = `catalog responded ${res.status}`;
    try {
      const body = (await res.json()) as { error?: { code?: string; message?: string } };
      code = body.error?.code ?? code;
      message = body.error?.message ?? message;
    } catch {
      // keep the status-line fallback
    }
    if (res.status >= 500) {
      throw new AppError('upstream_error', `catalog error: ${message}`);
    }
    return { ok: false, code, message };
  };
}
