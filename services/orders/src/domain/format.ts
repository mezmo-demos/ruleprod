/** Presentation helpers for order summaries. Locale-independent on purpose. */

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** e.g. "12 Jul" (UTC day, no leading zero, short month). */
export function shortDate(date: Date): string {
  return `${date.getUTCDate()} ${SHORT_MONTHS[date.getUTCMonth()]}`;
}

/** e.g. "15 units · placed 12 Jul" (middle dot, never an en dash). */
export function summaryLine(unitCount: number, placedAt: Date): string {
  const noun = unitCount === 1 ? 'unit' : 'units';
  return `${unitCount} ${noun} · placed ${shortDate(placedAt)}`;
}

/** Up to three distinct image keys, in line order. */
export function thumbs(images: readonly string[], max = 3): string[] {
  const seen: string[] = [];
  for (const image of images) {
    if (!seen.includes(image)) {
      seen.push(image);
      if (seen.length === max) break;
    }
  }
  return seen;
}
