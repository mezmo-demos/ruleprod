/** Promo validation — every failure mode gets its own code and user-facing message. */

import type { ErrorCode } from '@ruleprod/contracts';
import { PROMOS } from './config.js';
import { formatDayUTC, formatUsd, percentDiscountCents } from './money.js';

export type PromoFailureCode = Extract<
  ErrorCode,
  'promo_invalid' | 'promo_expired' | 'promo_minimum_not_met'
>;

export type PromoOutcome =
  | { ok: true; code: string; percentOff: number; discountCents: number }
  | { ok: false; code: PromoFailureCode; message: string };

/** Codes are valid through the whole of their last day, UTC. */
function endOfDayUTC(isoDate: string): number {
  return Date.parse(`${isoDate}T23:59:59.999Z`);
}

export function validatePromo(rawCode: string, subtotalCents: number, now: Date): PromoOutcome {
  const code = rawCode.trim().toUpperCase();
  const promo = PROMOS.find((p) => p.code === code);

  if (!promo) {
    return { ok: false, code: 'promo_invalid', message: "That code isn't recognised." };
  }

  if (promo.validThrough !== undefined && now.getTime() > endOfDayUTC(promo.validThrough)) {
    return {
      ok: false,
      code: 'promo_expired',
      message: `${promo.code} expired on ${formatDayUTC(promo.validThrough)}.`,
    };
  }

  if (promo.minSubtotalCents !== undefined && subtotalCents < promo.minSubtotalCents) {
    return {
      ok: false,
      code: 'promo_minimum_not_met',
      message: `${promo.code} requires a minimum subtotal of ${formatUsd(promo.minSubtotalCents)}.`,
    };
  }

  return {
    ok: true,
    code: promo.code,
    percentOff: promo.percentOff,
    discountCents: percentDiscountCents(subtotalCents, promo.percentOff),
  };
}
