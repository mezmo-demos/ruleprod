import { describe, expect, it } from 'vitest';
import {
  addBusinessDays,
  arrivesEstimate,
  BUSINESS_DAYS_BY_METHOD,
} from '../src/domain/businessDays.js';

const at = (iso: string) => new Date(iso);

describe('addBusinessDays', () => {
  it('adds weekdays with no weekend in the span', () => {
    // Mon 6 Jul 2026 + 4 → Fri 10 Jul
    expect(addBusinessDays(at('2026-07-06T10:00:00Z'), 4).toISOString()).toBe(
      '2026-07-10T10:00:00.000Z',
    );
  });

  it('skips a weekend mid-span', () => {
    // Wed 8 Jul 2026 + 4 → Tue 14 Jul (skips Sat 11 / Sun 12)
    expect(addBusinessDays(at('2026-07-08T09:30:00Z'), 4).toISOString()).toBe(
      '2026-07-14T09:30:00.000Z',
    );
  });

  it('skips the weekend immediately after a Friday start', () => {
    // Fri 10 Jul 2026 + 2 → Tue 14 Jul
    expect(addBusinessDays(at('2026-07-10T16:45:00Z'), 2).toISOString()).toBe(
      '2026-07-14T16:45:00.000Z',
    );
    // Fri 10 Jul 2026 + 4 → Thu 16 Jul
    expect(addBusinessDays(at('2026-07-10T16:45:00Z'), 4).toISOString()).toBe(
      '2026-07-16T16:45:00.000Z',
    );
  });

  it('counts from the next weekday for a Saturday start', () => {
    // Sat 11 Jul 2026 + 2 → Tue 14 Jul (Mon is day 1)
    expect(addBusinessDays(at('2026-07-11T12:00:00Z'), 2).toISOString()).toBe(
      '2026-07-14T12:00:00.000Z',
    );
  });

  it('counts from the next weekday for a Sunday start', () => {
    // Sun 12 Jul 2026 + 4 → Thu 16 Jul
    expect(addBusinessDays(at('2026-07-12T08:00:00Z'), 4).toISOString()).toBe(
      '2026-07-16T08:00:00.000Z',
    );
  });

  it('spans two weekends when needed', () => {
    // Thu 9 Jul 2026 + 6 → Fri 17 Jul (skips 11/12)... then +1 more weekend for +7
    expect(addBusinessDays(at('2026-07-09T00:00:00Z'), 7).toISOString()).toBe(
      '2026-07-20T00:00:00.000Z',
    );
  });

  it('preserves the time of day and returns a new Date', () => {
    const start = at('2026-07-06T23:59:59.123Z');
    const result = addBusinessDays(start, 1);
    expect(result.toISOString()).toBe('2026-07-07T23:59:59.123Z');
    expect(start.toISOString()).toBe('2026-07-06T23:59:59.123Z');
  });

  it('returns an equal date for 0 days', () => {
    const start = at('2026-07-11T12:00:00Z');
    expect(addBusinessDays(start, 0).getTime()).toBe(start.getTime());
  });

  it('rejects negative and fractional day counts', () => {
    expect(() => addBusinessDays(at('2026-07-06T00:00:00Z'), -1)).toThrow(RangeError);
    expect(() => addBusinessDays(at('2026-07-06T00:00:00Z'), 1.5)).toThrow(RangeError);
  });
});

describe('arrivesEstimate', () => {
  it('uses 4 business days for standard', () => {
    expect(BUSINESS_DAYS_BY_METHOD.standard).toBe(4);
    // Thu 9 Jul 2026 + 4 → Wed 15 Jul
    expect(arrivesEstimate(at('2026-07-09T14:00:00Z'), 'standard').toISOString()).toBe(
      '2026-07-15T14:00:00.000Z',
    );
  });

  it('uses 2 business days for expedited', () => {
    expect(BUSINESS_DAYS_BY_METHOD.expedited).toBe(2);
    // Thu 9 Jul 2026 + 2 → Mon 13 Jul (over the weekend)
    expect(arrivesEstimate(at('2026-07-09T14:00:00Z'), 'expedited').toISOString()).toBe(
      '2026-07-13T14:00:00.000Z',
    );
  });
});
