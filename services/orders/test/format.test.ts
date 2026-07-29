import { describe, expect, it } from 'vitest';
import { shortDate, summaryLine, thumbs } from '../src/domain/format.js';

describe('summaryLine', () => {
  it('matches the design copy, e.g. "15 units · placed 12 Jul"', () => {
    expect(summaryLine(15, new Date('2026-07-12T09:00:00Z'))).toBe('15 units · placed 12 Jul');
  });

  it('uses the singular for one unit', () => {
    expect(summaryLine(1, new Date('2026-03-01T00:00:00Z'))).toBe('1 unit · placed 1 Mar');
  });

  it('never contains an en dash and uses a middle dot separator', () => {
    const line = summaryLine(48, new Date('2026-11-30T23:00:00Z'));
    expect(line).not.toContain('–');
    expect(line).toContain(' · ');
  });
});

describe('shortDate', () => {
  it('renders UTC day without a leading zero and an English short month', () => {
    expect(shortDate(new Date('2026-01-05T00:00:00Z'))).toBe('5 Jan');
    expect(shortDate(new Date('2026-12-25T12:00:00Z'))).toBe('25 Dec');
  });

  it('is based on UTC, not the process locale or timezone', () => {
    // 23:30 UTC on the 12th stays the 12th regardless of local offset.
    expect(shortDate(new Date('2026-07-12T23:30:00Z'))).toBe('12 Jul');
  });
});

describe('thumbs', () => {
  it('caps at three images', () => {
    expect(thumbs(['a', 'b', 'c', 'd', 'e'])).toEqual(['a', 'b', 'c']);
  });

  it('deduplicates while preserving line order', () => {
    expect(thumbs(['a', 'a', 'b', 'a', 'c', 'd'])).toEqual(['a', 'b', 'c']);
  });

  it('returns fewer when fewer distinct images exist', () => {
    expect(thumbs(['a', 'a'])).toEqual(['a']);
    expect(thumbs([])).toEqual([]);
  });
});
