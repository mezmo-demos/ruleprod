import { createLogger } from '@ruleprod/telemetry';
import { makeClients } from './clients.js';
import { configFromEnv } from './config.js';
import { JOURNEY_MIX, runJourney } from './journeys.js';
import { nextArrivalDelayMs, pickWeighted, randomInt } from './pacing.js';
import { mintSession } from './session.js';

const log = createLogger('loadgen');
const config = configFromEnv();

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const counters = { launched: 0, completed: 0, failed: 0, shed: 0 };
let inFlight = 0;
let shuttingDown = false;

function launchJourney(): void {
  const name = pickWeighted(JOURNEY_MIX);
  const session = mintSession();
  inFlight += 1;
  counters.launched += 1;
  // Fire-and-forget: the arrival loop must keep its cadence regardless of how
  // long journeys run. runJourney contains all step failures itself.
  void runJourney(name, {
    clients: makeClients(config, session),
    session,
    rng: Math.random,
    log,
    pause: () => sleep(randomInt(300, 2000)),
  })
    .then((outcome) => {
      counters[outcome === 'completed' ? 'completed' : 'failed'] += 1;
    })
    .catch((err) => {
      counters.failed += 1;
      log.error({ err }, 'journey escaped its error handling');
    })
    .finally(() => {
      inFlight -= 1;
    });
}

log.info(
  { profile: config.profile, frontendUrl: config.frontendUrl, urls: config.urls },
  'loadgen starting',
);

const statsTimer = setInterval(() => {
  log.info({ ...counters, inFlight }, 'loadgen stats');
}, 60_000);

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(statsTimer);
  log.info({ signal, inFlight }, 'shutting down; draining in-flight journeys');
  const deadline = Date.now() + 30_000;
  while (inFlight > 0 && Date.now() < deadline) await sleep(250);
  log.info({ ...counters, abandonedInFlight: inFlight }, 'loadgen stopped');
  process.exit(0);
}

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => void shutdown(signal));
}

// Open-loop arrivals: journeys launch on the Poisson clock whether or not
// earlier ones finished, so a slow estate sees mounting concurrency exactly
// like a real rush — up to the profile's cap, where arrivals are shed (and
// counted; a nonzero shed rate in the stats line means the estate is not
// keeping up with the offered load).
while (!shuttingDown) {
  await sleep(nextArrivalDelayMs(config.profile.journeysPerMinute));
  if (shuttingDown) break;
  if (inFlight >= config.profile.maxConcurrent) {
    counters.shed += 1;
    log.warn(
      { inFlight, maxConcurrent: config.profile.maxConcurrent },
      'at concurrency cap; shedding arrival',
    );
    continue;
  }
  launchJourney();
}
