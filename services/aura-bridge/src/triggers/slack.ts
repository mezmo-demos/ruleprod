// Slack trigger over Socket Mode (no public events endpoint, works from a
// laptop). Thin: strips the mention, hands channel/thread context to the
// engine. Only started when real tokens are configured.
import type { FastifyBaseLogger } from 'fastify';
import type { InvestigationEngine } from '../control/engine.js';

export interface SlackTriggerDeps {
  engine: InvestigationEngine;
  logger: FastifyBaseLogger;
  botToken: string;
  appToken: string;
}

export interface StartedSlackTrigger {
  stop(): Promise<void>;
}

export async function startSlackTrigger(deps: SlackTriggerDeps): Promise<StartedSlackTrigger> {
  const { App } = await import('@slack/bolt');
  const app = new App({
    token: deps.botToken,
    appToken: deps.appToken,
    socketMode: true,
  });

  app.event('app_mention', async ({ event }) => {
    const text = event.text.replace(/<@[^>]+>/g, '').trim();
    // A reply inside a thread carries thread_ts; a top-level message doesn't.
    const threadTs = 'thread_ts' in event ? event.thread_ts : undefined;
    void deps.engine
      .handleMention({ channelId: event.channel, text, threadTs })
      .catch((err) => deps.logger.error({ err }, 'mention handling failed'));
  });

  app.action(/^aura_(approve|deny)$/, async ({ ack, action, body }) => {
    await ack();
    if (action.type !== 'button' || !('action_id' in action)) return;
    const approved = action.action_id === 'aura_approve';
    const userId = body.user.id;
    // Interactive payloads carry the handle — no users:read scope needed.
    const userName = 'username' in body.user ? body.user.username : body.user.name;
    void deps.engine
      .handleApprovalAction({ decisionId: action.value ?? '', userId, userName, approved })
      .catch((err) => deps.logger.error({ err }, 'approval action failed'));
  });

  await app.start();
  deps.logger.info('slack socket mode connected');
  return {
    stop: async () => {
      await app.stop();
    },
  };
}
