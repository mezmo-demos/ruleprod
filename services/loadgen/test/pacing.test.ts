import { describe, expect, it } from 'vitest';
import { nextArrivalDelayMs, pickOne, pickWeighted, randomInt, type Rng } from '../src/pacing.js';

/** Deterministic linear-congruential rng; good enough for distribution tests. */
function seededRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

describe('nextArrivalDelayMs', () => {
  it('has the right mean over many samples', () => {
    const rng = seededRng(42);
    const samples = 20_000;
    let total = 0;
    for (let i = 0; i < samples; i++) total += nextArrivalDelayMs(10, rng);
    const mean = total / samples;
    // Mean of Exp(rate) is 60000/10 = 6000ms; allow 5% sampling slop.
    expect(mean).toBeGreaterThan(6000 * 0.95);
    expect(mean).toBeLessThan(6000 * 1.05);
  });

  it('never returns a non-finite delay, even when rng returns 1', () => {
    expect(Number.isFinite(nextArrivalDelayMs(10, () => 1))).toBe(true);
    expect(nextArrivalDelayMs(10, () => 0)).toBe(0);
  });

  it('rejects a non-positive rate', () => {
    expect(() => nextArrivalDelayMs(0)).toThrow(/positive/);
  });
});

describe('pickWeighted', () => {
  const entries = [
    { value: 'a', weight: 1 },
    { value: 'b', weight: 3 },
  ] as const;

  it('lands proportionally to weight', () => {
    expect(pickWeighted(entries, () => 0)).toBe('a');
    expect(pickWeighted(entries, () => 0.24)).toBe('a');
    expect(pickWeighted(entries, () => 0.26)).toBe('b');
    expect(pickWeighted(entries, () => 0.99)).toBe('b');
  });

  it('survives an rng that returns exactly 1', () => {
    expect(pickWeighted(entries, () => 1)).toBe('b');
  });

  it('rejects empty or zero-weight entries', () => {
    expect(() => pickWeighted([], () => 0.5)).toThrow(/positive weight/);
    expect(() => pickWeighted([{ value: 'a', weight: 0 }], () => 0.5)).toThrow(/positive weight/);
  });
});

describe('pickOne / randomInt', () => {
  it('covers the full range inclusively', () => {
    expect(pickOne(['x', 'y', 'z'], () => 0)).toBe('x');
    expect(pickOne(['x', 'y', 'z'], () => 0.999)).toBe('z');
    expect(randomInt(1, 3, () => 0)).toBe(1);
    expect(randomInt(1, 3, () => 0.999)).toBe(3);
  });
});
