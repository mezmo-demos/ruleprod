// Alert digest: PdRestApi fetch/fallback behavior and the engine's use of it
// (channel digest post + enriched prompt; absent or failing PD API degrades to
// the title-only prompt).
import { describe, expect, it } from 'vitest';
import { SimAuraConnector } from '../src/aura/sim.js';
import { InvestigationEngine } from '../src/control/engine.js';
import { IncidentStore } from '../src/control/store.js';
import { digestFromAlerts, PdRestApi, type PdApiPort } from '../src/outbound/pdapi.js';
import { noopLogger, RecordingSlack } from './helpers.js';

const DIGEST = 'FIRING: cart: replicas unavailable — Deployment cart has had unavailable replicas.';

function setup(pdApi?: PdApiPort) {
  const store = new IncidentStore();
  const slack = new RecordingSlack();
  const engine = new InvestigationEngine({
    store,
    slack,
    connector: () => new SimAuraConnector(1),
    logger: noopLogger,
    statusUpdateIntervalMs: 0,
    channelNamePattern: 'incident_{number}',
    channelResolve: { attempts: 5, delayMs: 5 },
    pdApi,
  });
  return { store, slack, engine };
}

describe('digestFromAlerts', () => {
  it('prefers the structured "alerts" details key, then the firing blob, then summary', () => {
    expect(digestFromAlerts([{ body: { details: { alerts: `${DIGEST}\n`, firing: 'blob' } } }])).toBe(DIGEST);
    expect(digestFromAlerts([{ body: { details: { firing: 'blob' } }, summary: 's' }])).toBe('blob');
    expect(digestFromAlerts([{ summary: 'just a summary' }])).toBe('just a summary');
    expect(digestFromAlerts([{ body: { details: { alerts: '  ' } } }])).toBeUndefined();
    expect(digestFromAlerts([])).toBeUndefined();
  });
});

describe('PdRestApi', () => {
  it('fetches alerts with PD auth and never throws on failure', async () => {
    const calls: Array<{ url: string; auth: string | undefined }> = [];
    const ok = new PdRestApi({
      token: 'tok',
      logger: noopLogger,
      baseUrl: 'https://pd.test',
      fetchImpl: (async (url: string | URL | Request, init?: RequestInit) => {
        calls.push({ url: String(url), auth: (init?.headers as Record<string, string>).Authorization });
        return new Response(JSON.stringify({ alerts: [{ body: { details: { alerts: DIGEST } } }] }));
      }) as typeof fetch,
    });
    expect(await ok.fetchAlertDigest('P1')).toBe(DIGEST);
    expect(calls[0]?.url).toBe('https://pd.test/incidents/P1/alerts?limit=100');
    expect(calls[0]?.auth).toBe('Token token=tok');

    const failing = new PdRestApi({
      token: 'tok',
      logger: noopLogger,
      fetchImpl: (async () => {
        throw new Error('boom');
      }) as typeof fetch,
    });
    expect(await failing.fetchAlertDigest('P1')).toBeUndefined();
  });
});

describe('engine alert digest', () => {
  it('posts the digest to the channel and folds it into the prompt', async () => {
    const { store, slack, engine } = setup({ fetchAlertDigest: async () => DIGEST });
    await engine.handlePdIncident({ incidentId: 'P1', channelId: 'C1', title: 'cart: replicas unavailable' });

    const digestPost = slack.posts[0];
    expect(digestPost?.text).toContain('Alerts on this incident');
    expect(digestPost?.text).toContain(DIGEST);

    const tip = store.getIncident('P1')!.nodes[store.getIncident('P1')!.tipNodeId!]!;
    const prompt = String(tip.messages.at(0)?.content);
    expect(prompt).toContain('Alert details from the monitoring system');
    expect(prompt).toContain(DIGEST);
  });

  it('degrades to the title-only prompt without a digest', async () => {
    const { store, slack, engine } = setup({ fetchAlertDigest: async () => undefined });
    await engine.handlePdIncident({ incidentId: 'P2', channelId: 'C2', title: 't' });

    expect(slack.posts[0]?.text).toContain('AURA is working');
    const tip = store.getIncident('P2')!.nodes[store.getIncident('P2')!.tipNodeId!]!;
    expect(String(tip.messages.at(0)?.content)).not.toContain('Alert details');
  });
});
