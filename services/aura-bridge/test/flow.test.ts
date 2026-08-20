// End-to-end control flow: engine + sim connector + recording slack. Covers
// the full demo choreography without Slack, PagerDuty, aura, or a network.
import { describe, expect, it } from 'vitest';
import { SimAuraConnector } from '../src/aura/sim.js';
import { InvestigationEngine } from '../src/control/engine.js';
import { IncidentStore } from '../src/control/store.js';
import { noopLogger, RecordingSlack, until } from './helpers.js';

function setup() {
  const store = new IncidentStore();
  const slack = new RecordingSlack();
  const sim = new SimAuraConnector(1);
  const engine = new InvestigationEngine({
    store,
    slack,
    connector: () => sim,
    logger: noopLogger,
    statusUpdateIntervalMs: 0,
    channelNamePattern: 'incident_{number}',
    channelResolve: { attempts: 5, delayMs: 5 },
  });
  return { store, slack, sim, engine };
}

describe('InvestigationEngine', () => {
  it('runs the PD-triggered root investigation', async () => {
    const { store, slack, engine } = setup();
    await engine.handlePdIncident({ incidentId: 'P1', channelId: 'C1', title: 'cart is down' });

    // PD created the channel; the bot must join before posting.
    expect(slack.joined).toContain('C1');

    const investigating = slack.posts[0];
    expect(investigating?.text).toContain('investigating');
    expect(slack.updates.length).toBeGreaterThan(0); // live status edits
    const final = slack.posts.at(-1);
    expect(final?.text).toContain('Root cause');

    const incident = store.getIncident('P1');
    expect(incident?.tipNodeId).toBeDefined();
    const tip = incident!.nodes[incident!.tipNodeId!];
    expect(tip?.slackTs).toBe(final?.ts);
    expect(tip?.messages.at(0)?.content).toContain('P1');
    expect(tip?.messages.at(-1)?.role).toBe('assistant');
  });

  it('in-channel mention resumes the main line with full history', async () => {
    const { store, engine } = setup();
    await engine.handlePdIncident({ incidentId: 'P2', channelId: 'C2' });
    const rootTip = store.getIncident('P2')!.tipNodeId!;

    await engine.handleMention({ channelId: 'C2', text: 'what about the database?' });

    const incident = store.getIncident('P2')!;
    expect(incident.tipNodeId).not.toBe(rootTip);
    const tip = incident.nodes[incident.tipNodeId!]!;
    expect(tip.parentId).toBe(rootTip);
    // root(user+assistant) + followup(user+assistant)
    expect(tip.messages).toHaveLength(4);
  });

  it('thread reply forks from that answer and leaves the tip alone', async () => {
    const { store, slack, engine } = setup();
    await engine.handlePdIncident({ incidentId: 'P3', channelId: 'C3' });
    const rootAnswerTs = slack.posts.at(-1)!.ts;
    await engine.handleMention({ channelId: 'C3', text: 'followup one' });
    const tipAfterFollowup = store.getIncident('P3')!.tipNodeId!;

    await engine.handleMention({ channelId: 'C3', text: 'thread question', threadTs: rootAnswerTs });

    const incident = store.getIncident('P3')!;
    expect(incident.tipNodeId).toBe(tipAfterFollowup); // fork didn't move the tip
    // Replies landed in the thread; the answer there is the fork node.
    const threadPosts = slack.posts.filter((p) => p.threadTs === rootAnswerTs);
    expect(threadPosts.length).toBeGreaterThanOrEqual(2); // investigating + answer
    const fork = store.findNodeBySlackTs(incident, threadPosts.at(-1)!.ts);
    expect(fork).toBeDefined();
    expect(incident.nodes[fork!.parentId!]?.slackTs).toBe(rootAnswerTs);
    // Forked from root (2 messages), not from the followup tip (4).
    expect(fork!.messages).toHaveLength(4);
    expect(fork!.messages[2]?.content).toBe('thread question');
  });

  it('ignores mentions outside incident channels', async () => {
    const { slack, engine } = setup();
    await engine.handleMention({ channelId: 'C-random', text: 'hello?' });
    expect(slack.posts).toHaveLength(0);
  });

  it('queues overlapping requests on one incident', async () => {
    const { slack, engine } = setup();
    await engine.handlePdIncident({ incidentId: 'P4', channelId: 'C4' });
    const first = engine.handleMention({ channelId: 'C4', text: 'one' });
    const second = engine.handleMention({ channelId: 'C4', text: 'two' });
    await Promise.all([first, second]);
    expect(slack.posts.some((p) => p.text.includes('queued'))).toBe(true);
    // Both runs completed with final answers.
    const finals = slack.posts.filter((p) => p.text.includes('Root cause'));
    expect(finals.length).toBeGreaterThanOrEqual(3);
  });

  it('posts approval buttons, resolves via action, broadcasts from threads', async () => {
    const { slack, engine } = setup();
    await engine.handlePdIncident({ incidentId: 'P5', channelId: 'C5' });
    const rootAnswerTs = slack.posts.at(-1)!.ts;

    const run = engine.handleMention({
      channelId: 'C5',
      text: 'can you check the node logs?',
      threadTs: rootAnswerTs,
    });
    await until(() => engine.status().pendingApprovals.length > 0);

    const buttonPost = slack.posts.find((p) => p.blocks && p.text.includes('nodes_log'));
    expect(buttonPost).toBeDefined();
    expect(buttonPost!.threadTs).toBe(rootAnswerTs);
    expect(buttonPost!.broadcast).toBe(true); // "also send to #channel"

    const decisionId = engine.status().pendingApprovals[0]!;
    const outcome = await engine.handleApprovalAction({ decisionId, userId: 'U123', approved: true });
    expect(outcome).toContain('Approved');
    await run;

    const buttonUpdate = slack.updates.find((u) => u.ts === buttonPost!.ts);
    expect(buttonUpdate?.text).toContain('approved');
    expect(engine.status().pendingApprovals).toHaveLength(0);
    expect(slack.posts.at(-1)!.text).toContain('kubelet');
  });

  it('resolves the incident channel from the naming pattern, with retry and join', async () => {
    const { store, slack, engine } = setup();
    // Channel appears only after the first lookup — the PD webhook racing the
    // workflow's channel creation.
    setTimeout(() => slack.channels.set('incident_42', 'C-INC42'), 12);
    await engine.handlePdIncident({ incidentId: 'PD-abc', incidentNumber: 42 });

    expect(slack.findChannelIdCalls).toBeGreaterThan(1);
    expect(slack.joined).toContain('C-INC42');
    expect(store.getIncident('PD-abc')?.channelId).toBe('C-INC42');
    expect(slack.posts.at(-1)?.channel).toBe('C-INC42');
  });

  it('fails cleanly when the incident channel never appears', async () => {
    const { slack, engine } = setup();
    await expect(engine.handlePdIncident({ incidentId: 'PD-x', incidentNumber: 7 })).rejects.toThrow(
      'incident_7',
    );
    expect(slack.posts).toHaveLength(0);
  });

  it('reports unknown decisions as expired', async () => {
    const { engine } = setup();
    const outcome = await engine.handleApprovalAction({ decisionId: 'ghost', userId: 'U1', approved: true });
    expect(outcome).toContain('expired');
  });
});
