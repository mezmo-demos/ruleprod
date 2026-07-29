import type { DeliveryMethod } from '@ruleprod/contracts';

/** Business days added per delivery method (contract: standard 4, expedited 2). */
export const BUSINESS_DAYS_BY_METHOD: Record<DeliveryMethod, number> = {
  standard: 4,
  expedited: 2,
};

const SATURDAY = 6;
const SUNDAY = 0;

function isWeekend(date: Date): boolean {
  const dow = date.getUTCDay();
  return dow === SATURDAY || dow === SUNDAY;
}

/**
 * Add `days` business days to `start`, skipping Saturdays and Sundays (UTC).
 * A weekend start counts from the next weekday: each step advances at least
 * one calendar day and only weekdays consume a business day.
 */
export function addBusinessDays(start: Date, days: number): Date {
  if (!Number.isInteger(days) || days < 0) {
    throw new RangeError(`days must be a non-negative integer, got ${days}`);
  }
  const result = new Date(start.getTime());
  let remaining = days;
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    if (!isWeekend(result)) remaining -= 1;
  }
  return result;
}

/** placedAt + 4 business days (standard) / 2 (expedited). */
export function arrivesEstimate(placedAt: Date, method: DeliveryMethod): Date {
  return addBusinessDays(placedAt, BUSINESS_DAYS_BY_METHOD[method]);
}
