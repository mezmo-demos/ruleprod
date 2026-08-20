// PagerDuty v3 webhook trigger. Signature: X-PagerDuty-Signature carries
// comma-separated "v1=<hex hmac-sha256 of raw body>" entries; any match wins
// (PD sends multiples during secret rotation). No secret configured = accept
// unsigned (local dev only — production always sets PD_WEBHOOK_SECRET).
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { InvestigationEngine } from '../control/engine.js';

export function verifyPdSignature(rawBody: Buffer, header: string | undefined, secret: string): boolean {
  if (!header) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return header
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.startsWith('v1='))
    .some((s) => {
      const candidate = s.slice(3);
      return (
        candidate.length === expected.length &&
        timingSafeEqual(Buffer.from(candidate, 'utf8'), Buffer.from(expected, 'utf8'))
      );
    });
}

interface PdWebhookBody {
  event?: {
    event_type?: string;
    data?: {
      id?: string;
      number?: number;
      title?: string;
    };
  };
  // Flat shape used by admin/TUI injection.
  incidentId?: string;
  incidentNumber?: number;
  channelId?: string;
  title?: string;
}

export function registerPagerDutyTrigger(
  app: FastifyInstance,
  opts: { engine: InvestigationEngine; secret?: string },
): void {
  // Scoped plugin: this route needs the raw body for signature verification.
  void app.register(async (scope) => {
    scope.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
      done(null, body);
    });

    scope.post('/webhooks/pagerduty', async (request, reply) => {
      const rawBody = request.body as Buffer;
      if (opts.secret) {
        const header = request.headers['x-pagerduty-signature'];
        if (!verifyPdSignature(rawBody, typeof header === 'string' ? header : undefined, opts.secret)) {
          return reply.status(401).send({ error: { code: 'invalid_request', message: 'bad signature' } });
        }
      }

      let body: PdWebhookBody;
      try {
        body = JSON.parse(rawBody.toString('utf8')) as PdWebhookBody;
      } catch {
        return reply.status(400).send({ error: { code: 'invalid_request', message: 'invalid JSON' } });
      }

      // Only incident.triggered starts an investigation; acks/resolves/etc.
      // from the same subscription are acknowledged and dropped.
      const eventType = body.event?.event_type;
      if (eventType && eventType !== 'incident.triggered') {
        return reply.status(202).send({ status: 'ignored' });
      }

      const incidentId = body.event?.data?.id ?? body.incidentId;
      const incidentNumber = body.event?.data?.number ?? body.incidentNumber;
      const channelId = body.channelId;
      const title = body.event?.data?.title ?? body.title;
      if (!incidentId || (!channelId && incidentNumber === undefined)) {
        return reply.status(400).send({
          error: { code: 'invalid_request', message: 'missing incident id, and no channel id or incident number' },
        });
      }

      // Ack immediately; the investigation runs long after PD's timeout.
      void opts.engine
        .handlePdIncident({ incidentId, incidentNumber, channelId, title })
        .catch((err) => {
          request.log.error({ err, incidentId }, 'pd-triggered investigation failed to start');
        });
      return reply.status(202).send({ status: 'accepted' });
    });
  });
}
