// PagerDuty REST client: fetches an incident's alert bodies so the engine can
// show the humans (and aura) WHAT is firing, not just the incident title. The
// Grafana contact point writes a pre-formatted per-alert digest into the alert
// body's details under the "alerts" key (terramate grafana-alerting stack) —
// key name and shape are a cross-repo contract. Older/foreign alerts fall back
// to Grafana's default "firing" details blob, then to the alert summary.
import type { FastifyBaseLogger } from 'fastify';

export interface PdApiPort {
  /** Multi-line digest of the incident's alerts, or undefined when there is
   * nothing useful (no token, fetch failure, empty bodies). Never throws. */
  fetchAlertDigest(incidentId: string): Promise<string | undefined>;
}

interface PdAlert {
  status?: string;
  summary?: string;
  body?: { details?: Record<string, unknown> };
}

export class PdRestApi implements PdApiPort {
  constructor(
    private opts: {
      token: string;
      logger: FastifyBaseLogger;
      baseUrl?: string;
      fetchImpl?: typeof fetch;
    },
  ) {}

  async fetchAlertDigest(incidentId: string): Promise<string | undefined> {
    const base = this.opts.baseUrl ?? 'https://api.pagerduty.com';
    const doFetch = this.opts.fetchImpl ?? fetch;
    try {
      const res = await doFetch(`${base}/incidents/${encodeURIComponent(incidentId)}/alerts?limit=100`, {
        headers: {
          Authorization: `Token token=${this.opts.token}`,
          Accept: 'application/vnd.pagerduty+json;version=2',
        },
      });
      if (!res.ok) {
        this.opts.logger.warn({ incidentId, status: res.status }, 'pd alerts fetch failed');
        return undefined;
      }
      const data = (await res.json()) as { alerts?: PdAlert[] };
      return digestFromAlerts(data.alerts ?? []);
    } catch (err) {
      this.opts.logger.warn({ err, incidentId }, 'pd alerts fetch failed');
      return undefined;
    }
  }
}

export function digestFromAlerts(alerts: PdAlert[]): string | undefined {
  const parts = alerts
    .map((alert) => {
      const details = alert.body?.details;
      const structured = details?.alerts;
      if (typeof structured === 'string' && structured.trim()) return structured.trim();
      const firing = details?.firing;
      if (typeof firing === 'string' && firing.trim()) return firing.trim();
      return alert.summary?.trim() || undefined;
    })
    .filter((s): s is string => Boolean(s));
  return parts.length ? parts.join('\n') : undefined;
}
