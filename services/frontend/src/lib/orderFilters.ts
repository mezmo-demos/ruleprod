import type { OrderSummary } from '@ruleprod/contracts';

/** The ranges the account page's date filter offers. */
export const ORDER_RANGES = [
  { value: 'all', label: 'All time', days: null },
  { value: '30d', label: 'Last 30 days', days: 30 },
  { value: '90d', label: 'Last 90 days', days: 90 },
  { value: '12m', label: 'Last 12 months', days: 365 },
] as const;

export type OrderRange = (typeof ORDER_RANGES)[number]['value'];

/** Anything unrecognised (or absent) reads as the default, "all". */
export function parseRange(raw: string | string[] | undefined | null): OrderRange {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const match = ORDER_RANGES.find((range) => range.value === value);
  return match ? match.value : 'all';
}

export function rangeLabel(range: OrderRange): string {
  return ORDER_RANGES.find((r) => r.value === range)?.label ?? 'All time';
}

/** Orders placed within the range, newest-first order preserved. */
export function filterByRange(
  orders: readonly OrderSummary[],
  range: OrderRange,
  now: Date = new Date(),
): OrderSummary[] {
  const days = ORDER_RANGES.find((r) => r.value === range)?.days ?? null;
  if (days === null) return [...orders];

  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  return orders.filter((order) => Date.parse(order.placedAt) >= cutoff);
}
