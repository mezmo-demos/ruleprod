// HttpAuraConnector against a canned SSE server shaped like aura's
// /v1/chat/completions stream (chunk deltas + named aura.* events + [DONE]).
import Fastify from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AuraEvent } from '../src/aura/connector.js';
import { HttpAuraConnector, sseFrames } from '../src/aura/http.js';

const SSE_BODY = [
  ': heartbeat',
  '',
  'event: aura.session_info',
  'data: {"session_id":"cs_1"}',
  '',
  'event: aura.progress',
  'data: {"message":"dispatching cluster_inspector"}',
  '',
  'data: {"choices":[{"delta":{"content":"Root cause: "}}]}',
  '',
  'event: aura.approval_pending',
  'data: {"decision_id":"dec_1","tool_name":"nodes_log","arguments":{"name":"node-a"}}',
  '',
  'event: aura.approval_completed',
  'data: {"decision_id":"dec_1","outcome":"approved"}',
  '',
  'data: {"choices":[{"delta":{"content":"OOM in cart."}}]}',
  '',
  'data: [DONE]',
  '',
].join('\n');

describe('sseFrames', () => {
  it('parses frames across arbitrary chunk boundaries', async () => {
    const bytes = new TextEncoder().encode(SSE_BODY);
    // 7-byte chunks split lines mid-field.
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let i = 0; i < bytes.length; i += 7) controller.enqueue(bytes.slice(i, i + 7));
        controller.close();
      },
    });
    const frames = [];
    for await (const frame of sseFrames(stream)) frames.push(frame);
    expect(frames).toHaveLength(7);
    expect(frames[0]).toEqual({ event: 'aura.session_info', data: '{"session_id":"cs_1"}' });
    expect(frames[2]?.event).toBeUndefined();
    expect(frames.at(-1)?.data).toBe('[DONE]');
  });
});

describe('HttpAuraConnector', () => {
  const app = Fastify();
  let baseUrl: string;
  let approvalBody: unknown;

  beforeAll(async () => {
    app.post('/v1/chat/completions', async (_request, reply) => {
      reply.raw.writeHead(200, { 'content-type': 'text/event-stream' });
      reply.raw.end(SSE_BODY);
    });
    app.post<{ Params: { id: string } }>('/v1/approvals/:id', async (request, reply) => {
      approvalBody = request.body;
      return reply.status(request.params.id === 'dec_1' ? 204 : 404).send();
    });
    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address();
    baseUrl = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
  });

  afterAll(() => app.close());

  it('maps the stream to connector events and accumulates the final text', async () => {
    const connector = new HttpAuraConnector(baseUrl);
    const events: AuraEvent[] = [];
    for await (const ev of connector.run({ sessionId: 'cs_1', messages: [{ role: 'user', content: 'go' }] })) {
      events.push(ev);
    }
    expect(events).toEqual([
      { kind: 'status', text: 'dispatching cluster_inspector' },
      { kind: 'approval_pending', decisionId: 'dec_1', toolName: 'nodes_log', args: { name: 'node-a' } },
      { kind: 'approval_completed', decisionId: 'dec_1', outcome: 'approved' },
      { kind: 'final', text: 'Root cause: OOM in cart.' },
    ]);
  });

  it('resolves approvals with the documented payload and status codes', async () => {
    const connector = new HttpAuraConnector(baseUrl);
    expect(await connector.resolveApproval('dec_1', false, 'nope')).toBe(true);
    expect(approvalBody).toEqual({ approved: false, reason: 'nope' });
    expect(await connector.resolveApproval('unknown', true)).toBe(false);
  });

  it('yields an error event on non-2xx', async () => {
    const connector = new HttpAuraConnector(`${baseUrl}/missing`);
    const events: AuraEvent[] = [];
    for await (const ev of connector.run({ sessionId: 's', messages: [] })) events.push(ev);
    expect(events[0]?.kind).toBe('error');
  });
});
