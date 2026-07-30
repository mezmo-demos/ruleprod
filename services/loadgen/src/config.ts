import { serviceUrls } from '@ruleprod/telemetry';

/**
 * A traffic profile: how much load, and how much in-flight work we allow
 * before arrivals are shed. Rates are open-loop (arrivals keep coming whether
 * or not earlier journeys have finished), so under a struggling estate the
 * concurrency cap is what stops loadgen piling on unboundedly.
 */
export interface Profile {
  name: ProfileName;
  /** Mean journey arrivals per minute (Poisson; see pacing.ts). */
  journeysPerMinute: number;
  /** Journeys allowed in flight at once; arrivals beyond this are dropped. */
  maxConcurrent: number;
}

export const PROFILE_NAMES = ['quiet', 'steady', 'busy', 'rush'] as const;
export type ProfileName = (typeof PROFILE_NAMES)[number];

/**
 * The scale ladder. `quiet` keeps dashboards alive overnight, `steady` is the
 * always-on demo baseline, `busy` looks like a promo day, and `rush` exists to
 * push the estate hard enough to surface limits (the cart OOM scenario).
 */
export const PROFILES: Record<ProfileName, Profile> = {
  quiet: { name: 'quiet', journeysPerMinute: 2, maxConcurrent: 4 },
  steady: { name: 'steady', journeysPerMinute: 10, maxConcurrent: 10 },
  busy: { name: 'busy', journeysPerMinute: 30, maxConcurrent: 25 },
  rush: { name: 'rush', journeysPerMinute: 90, maxConcurrent: 60 },
};

export interface LoadgenConfig {
  profile: Profile;
  /**
   * Page-view reads go through the frontend so a journey exercises the same
   * path a browser does; not part of serviceUrls() because no service calls
   * the frontend.
   */
  frontendUrl: string;
  /** Backend base URLs (catalog, cart, checkout, orders) — direct writes. */
  urls: ReturnType<typeof serviceUrls>;
  /** Per-request timeout; a journey step past this is a failed step. */
  requestTimeoutMs: number;
}

/**
 * LOADGEN_PROFILE picks the scale; LOADGEN_JOURNEYS_PER_MINUTE and
 * LOADGEN_MAX_CONCURRENT override the chosen profile's numbers piecemeal so a
 * demo can dial load without defining a whole new profile.
 */
export function configFromEnv(env: NodeJS.ProcessEnv = process.env): LoadgenConfig {
  const name = (env.LOADGEN_PROFILE ?? 'steady') as ProfileName;
  if (!PROFILE_NAMES.includes(name)) {
    throw new Error(
      `Unknown LOADGEN_PROFILE "${name}"; expected one of ${PROFILE_NAMES.join(', ')}`,
    );
  }
  const base = PROFILES[name];

  const profile: Profile = {
    name,
    journeysPerMinute: positiveNumber(
      env.LOADGEN_JOURNEYS_PER_MINUTE,
      'LOADGEN_JOURNEYS_PER_MINUTE',
      base.journeysPerMinute,
    ),
    maxConcurrent: positiveNumber(
      env.LOADGEN_MAX_CONCURRENT,
      'LOADGEN_MAX_CONCURRENT',
      base.maxConcurrent,
    ),
  };

  return {
    profile,
    frontendUrl: env.FRONTEND_URL ?? 'http://frontend.ruleprod-apps.svc.cluster.local',
    urls: serviceUrls(env),
    requestTimeoutMs: positiveNumber(
      env.LOADGEN_REQUEST_TIMEOUT_MS,
      'LOADGEN_REQUEST_TIMEOUT_MS',
      10_000,
    ),
  };
}

function positiveNumber(raw: string | undefined, name: string, fallback: number): number {
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number, got "${raw}"`);
  }
  return value;
}
