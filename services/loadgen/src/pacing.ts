/**
 * Pure pacing math. Everything takes an injectable rng so tests are
 * deterministic; callers default to Math.random.
 */

export type Rng = () => number;

/**
 * Milliseconds until the next journey launch, drawn from an exponential
 * distribution — i.e. journeys arrive as a Poisson process at the profile's
 * mean rate. Real shoppers cluster; a fixed interval would make every graph
 * suspiciously flat and never overlap journeys at low rates.
 */
export function nextArrivalDelayMs(journeysPerMinute: number, rng: Rng = Math.random): number {
  if (journeysPerMinute <= 0) {
    throw new Error(`journeysPerMinute must be positive, got ${journeysPerMinute}`);
  }
  const meanDelayMs = 60_000 / journeysPerMinute;
  // Inverse-transform sampling; guard the log's argument away from zero.
  // Math.max also normalises the rng()=0 case's -0 to a true zero.
  return Math.max(0, -Math.log(1 - Math.min(rng(), 1 - Number.EPSILON)) * meanDelayMs);
}

export interface Weighted<T> {
  value: T;
  weight: number;
}

/** Pick one entry with probability proportional to its weight. */
export function pickWeighted<T>(entries: readonly Weighted<T>[], rng: Rng = Math.random): T {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (entries.length === 0 || total <= 0) {
    throw new Error('pickWeighted needs at least one entry with positive weight');
  }
  let remaining = rng() * total;
  for (const entry of entries) {
    remaining -= entry.weight;
    if (remaining < 0) return entry.value;
  }
  // Floating-point edge: rng() returned ~1 and remaining never crossed zero.
  return entries[entries.length - 1]!.value;
}

/** Pick a uniformly random element; total-weight-1 special case reads better inline. */
export function pickOne<T>(items: readonly T[], rng: Rng = Math.random): T {
  if (items.length === 0) throw new Error('pickOne needs a non-empty array');
  return items[Math.min(Math.floor(rng() * items.length), items.length - 1)]!;
}

/** Uniform integer in [min, max] — quantities, dwell counts. */
export function randomInt(min: number, max: number, rng: Rng = Math.random): number {
  return min + Math.floor(rng() * (max - min + 1));
}
