// Investigation engine: the routing/control layer between triggers, aura, and
// Slack. Owns the conversation tree, per-incident FIFO, live status edits, and
// the approval registry. Triggers stay thin; this is the only place that knows
// the demo's message choreography.
import type { FastifyBaseLogger } from 'fastify';
import type { AuraConnector, BoardLine, ChatMessage } from '../aura/connector.js';
import { markdownToMrkdwn } from '../outbound/mrkdwn.js';
import { approvalBlocks, approvalResolvedBlocks, runStatusBlocks, type SlackPort } from '../outbound/slack.js';
import { authorizeButton } from './approver.js';
import { KeyedQueue } from './queue.js';
import type { Incident, IncidentStore } from './store.js';

export interface EngineDeps {
  store: IncidentStore;
  slack: SlackPort;
  /** Resolved per run so the admin API can flip real/sim live. */
  connector: () => AuraConnector;
  logger: FastifyBaseLogger;
  statusUpdateIntervalMs: number;
  /** `{number}` is replaced with the PD incident number. Must match the PD
   * incident workflow's "Create a Slack Channel" action. */
  channelNamePattern: string;
  /** The PD webhook races the workflow's channel creation — retry the lookup. */
  channelResolve: { attempts: number; delayMs: number };
}

interface RunRequest {
  incident: Incident;
  parentNodeId?: string;
  prompt: string;
  /** Reply into this thread; undefined = channel top level (main line). */
  threadTs?: string;
}

interface PendingApproval {
  connectorName: string;
  toolName: string;
  channel: string;
  ts: string;
  incidentId: string;
}

interface ActiveRun {
  controller: AbortController;
  /** Set by handleStopAction before aborting — how the catch path tells a
   * user-stop from a real failure. */
  stoppedBy?: string;
}

export class InvestigationEngine {
  private queue = new KeyedQueue();
  private pendingApprovals = new Map<string, PendingApproval>();
  /** At most one per incident — the KeyedQueue serializes runs. */
  private activeRuns = new Map<string, ActiveRun>();

  constructor(private deps: EngineDeps) {}

  /** PagerDuty webhook (or admin injection): start the root investigation.
   * Without an explicit channelId, the incident channel is resolved from the
   * naming pattern + incident number. */
  async handlePdIncident(opts: {
    incidentId: string;
    incidentNumber?: number;
    channelId?: string;
    title?: string;
  }): Promise<void> {
    let channelId = opts.channelId;
    if (!channelId) {
      if (opts.incidentNumber === undefined) {
        throw new Error('need channelId or incidentNumber to locate the incident channel');
      }
      channelId = await this.resolveIncidentChannel(opts.incidentNumber);
    } else {
      // PD's workflow created this channel moments ago — the bot isn't in it.
      await this.joinQuietly(channelId);
    }
    const incident = this.deps.store.upsertIncident({
      id: opts.incidentId,
      channelId,
      title: opts.title,
    });
    const prompt = `Investigate PagerDuty incident ${incident.id}${incident.title ? `: "${incident.title}"` : ''}. Identify the root cause and impacted services; report specific resource names and evidence.`;
    return this.enqueue({ incident, prompt });
  }

  /** Slack @mention. In-channel = resume main line; thread reply under an aura answer = fork from it. */
  async handleMention(opts: { channelId: string; text: string; threadTs?: string }): Promise<void> {
    const incident = this.deps.store.findByChannel(opts.channelId);
    if (!incident) {
      // Tagging aura outside an incident channel is disabled for now.
      this.deps.logger.info({ channelId: opts.channelId }, 'mention outside incident channel ignored');
      return;
    }
    let parentNodeId = incident.tipNodeId;
    if (opts.threadTs) {
      const node = this.deps.store.findNodeBySlackTs(incident, opts.threadTs);
      if (node) parentNodeId = node.id;
    }
    return this.enqueue({ incident, parentNodeId, prompt: opts.text, threadTs: opts.threadTs });
  }

  /** Slack button click (or admin/TUI). Returns text describing what happened, for the message update. */
  async handleApprovalAction(opts: {
    decisionId: string;
    userId: string;
    userName?: string;
    approved: boolean;
  }): Promise<string> {
    const pending = this.pendingApprovals.get(opts.decisionId);
    const incident = pending ? this.deps.store.getIncident(pending.incidentId) : undefined;
    if (!authorizeButton(opts.approved ? 'approve' : 'deny', opts.userId, incident)) {
      return 'You are not authorized to approve AURA actions for this incident.';
    }
    // The reason lands in aura's transcript/logs — a handle reads better than
    // a raw Slack id.
    const approver = opts.userName ? `@${opts.userName} (${opts.userId})` : opts.userId;
    const resolved = await this.deps.connector().resolveApproval(
      opts.decisionId,
      opts.approved,
      opts.approved ? undefined : `denied by ${approver}`,
    );
    if (!resolved) return 'This approval already expired or was resolved.';
    if (pending) {
      this.pendingApprovals.delete(opts.decisionId);
      await this.deps.slack.updateMessage({
        channel: pending.channel,
        ts: pending.ts,
        text: `\`${pending.toolName}\` ${opts.approved ? 'approved' : 'denied'}`,
        blocks: approvalResolvedBlocks({
          toolName: pending.toolName,
          outcome: opts.approved ? 'approved' : 'denied',
          actor: opts.userId,
        }),
      });
    }
    return opts.approved ? 'Approved — AURA is continuing.' : 'Denied — AURA will stop that action.';
  }

  /** Stop button click (or admin/TUI). Aborts the incident's active run; the
   * run's own catch path renders the stopped board and cleans up approvals.
   * Returns text describing what happened. */
  async handleStopAction(opts: { incidentId: string; userId: string; userName?: string }): Promise<string> {
    const incident = this.deps.store.getIncident(opts.incidentId);
    if (!authorizeButton('stop', opts.userId, incident)) {
      return 'You are not authorized to stop AURA runs for this incident.';
    }
    const run = this.activeRuns.get(opts.incidentId);
    if (!run) return 'No AURA run is in progress for this incident.';
    if (run.stoppedBy) return 'Already stopping.';
    run.stoppedBy = opts.userId;
    run.controller.abort();
    return 'Stopping — AURA is cancelling this run.';
  }

  status(): { incidents: number; pendingApprovals: string[]; busy: string[] } {
    const incidents = this.deps.store.listIncidents();
    return {
      incidents: incidents.length,
      pendingApprovals: [...this.pendingApprovals.keys()],
      busy: incidents.filter((i) => this.queue.isBusy(i.id)).map((i) => i.id),
    };
  }

  private async joinQuietly(channelId: string): Promise<void> {
    try {
      await this.deps.slack.joinChannel(channelId);
    } catch (err) {
      // already_in_channel and friends — posting will surface real failures.
      this.deps.logger.info({ err, channelId }, 'joinChannel failed, continuing');
    }
  }

  private async resolveIncidentChannel(incidentNumber: number): Promise<string> {
    const name = this.deps.channelNamePattern.replace('{number}', String(incidentNumber));
    const { attempts, delayMs } = this.deps.channelResolve;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const channelId = await this.deps.slack.findChannelId(name);
      if (channelId) {
        await this.joinQuietly(channelId);
        return channelId;
      }
      this.deps.logger.info({ name, attempt }, 'incident channel not found yet, retrying');
      await new Promise((r) => setTimeout(r, delayMs));
    }
    throw new Error(`incident channel "${name}" not found after ${attempts} attempts`);
  }

  private enqueue(req: RunRequest): Promise<void> {
    if (this.queue.isBusy(req.incident.id)) {
      void this.deps.slack.postMessage({
        channel: req.incident.channelId,
        threadTs: req.threadTs,
        text: ':hourglass: AURA is queued behind the current investigation.',
      });
    }
    return this.queue.run(req.incident.id, () => this.execute(req));
  }

  private async execute(req: RunRequest): Promise<void> {
    const { slack, store, logger } = this.deps;
    const messages = this.buildMessages(req);
    const run: ActiveRun = { controller: new AbortController() };
    const stop = { incidentId: req.incident.id };
    const statusMsg = await slack.postMessage({
      channel: req.incident.channelId,
      threadTs: req.threadTs,
      text: investigatingText(),
      blocks: runStatusBlocks({ text: investigatingText(), stop }),
    });
    // Registered only once the status message (and its Stop button) exists.
    this.activeRuns.set(req.incident.id, run);

    const startedAt = Date.now();
    let lastEdit = 0;
    let latestStatus: string | undefined;
    let tokensUsed = 0;
    let finalText: string | undefined;
    const connector = this.deps.connector();

    // Orchestration task board: a chronological log, not one-row-per-actor.
    // Live rows update in place; done rows freeze. A returning actor gets a
    // fresh row below — task ids restart at 0 on every replan wave, so a done
    // `task-0` row is a prior wave's record, and each coordinator reappearance
    // (replan, extra dispatch, synthesis) opens a new segment of the log.
    const board: Array<{ key: string; text: string; done: boolean }> = [];
    const applyBoard = (line: BoardLine) => {
      if (line.key === 'coordinator') {
        // Coordinator events arrive in bursts (plan_created → replan_started
        // back-to-back): consecutive ones share a row, keeping the latest text.
        const last = board.at(-1);
        if (last?.key === 'coordinator') last.text = line.text;
        else board.push({ key: line.key, text: line.text, done: false });
        return;
      }
      const live = board.findLast((r) => r.key === line.key);
      if (live && !live.done) {
        live.text = line.text;
        live.done = Boolean(line.done);
      } else {
        board.push({ key: line.key, text: line.text, done: Boolean(line.done) });
      }
    };
    const boardRows = () => board.map((r) => `● ${r.text}`);
    const renderStatus = () => {
      if (board.length === 0) return investigatingText(latestStatus, tokensUsed);
      return [':mag: *AURA is working…*', ...boardRows()].join('\n');
    };
    const editStatus = async (force = false) => {
      const now = Date.now();
      if (!force && now - lastEdit < this.deps.statusUpdateIntervalMs) return;
      lastEdit = now;
      const text = renderStatus();
      await slack.updateMessage({
        channel: statusMsg.channel,
        ts: statusMsg.ts,
        text,
        blocks: runStatusBlocks({ text, stop }),
      });
    };

    try {
      for await (const ev of connector.run({
        sessionId: req.incident.sessionId,
        messages,
        signal: run.controller.signal,
      })) {
        switch (ev.kind) {
          case 'status':
            latestStatus = ev.text;
            await editStatus();
            break;
          case 'board':
            applyBoard(ev.line);
            await editStatus();
            break;
          case 'usage':
            tokensUsed += ev.totalTokens;
            await editStatus();
            break;
          case 'approval_pending': {
            const posted = await slack.postMessage({
              channel: req.incident.channelId,
              threadTs: req.threadTs,
              // HITL messages born in a thread must also land in the channel.
              broadcast: Boolean(req.threadTs),
              text: `AURA wants to run \`${ev.toolName}\` — approve or deny`,
              blocks: approvalBlocks({ decisionId: ev.decisionId, toolName: ev.toolName, args: ev.args }),
            });
            this.pendingApprovals.set(ev.decisionId, {
              connectorName: connector.name,
              toolName: ev.toolName,
              channel: posted.channel,
              ts: posted.ts,
              incidentId: req.incident.id,
            });
            break;
          }
          case 'approval_completed': {
            // Normally resolved by handleApprovalAction; this catches timeouts
            // and out-of-band resolutions.
            const pending = this.pendingApprovals.get(ev.decisionId);
            if (pending) {
              this.pendingApprovals.delete(ev.decisionId);
              await slack.updateMessage({
                channel: pending.channel,
                ts: pending.ts,
                text: `\`${pending.toolName}\` ${ev.outcome}`,
                blocks: approvalResolvedBlocks({ toolName: pending.toolName, outcome: ev.outcome }),
              });
            }
            break;
          }
          case 'final':
            finalText = ev.text;
            break;
          case 'error':
            throw new Error(ev.message);
        }
      }

      if (finalText === undefined) throw new Error('run ended without a final response');

      const answer = await slack.postMessage({
        channel: req.incident.channelId,
        threadTs: req.threadTs,
        text: markdownToMrkdwn(finalText),
      });
      const summary = [doneText(startedAt, tokensUsed), ...boardRows()].join('\n');
      await slack.updateMessage({
        channel: statusMsg.channel,
        ts: statusMsg.ts,
        text: summary,
        // blocks without `stop` — this edit is what removes the Stop button.
        blocks: runStatusBlocks({ text: summary }),
      });
      store.addNode(req.incident, {
        parentId: req.parentNodeId,
        messages: [...messages, { role: 'assistant', content: finalText }],
        slackTs: answer.ts,
        // Thread forks never move the main-line tip.
        mainLine: !req.threadTs,
      });
    } catch (err) {
      const text = run.stoppedBy
        ? [stoppedText(run.stoppedBy, startedAt, tokensUsed), ...boardRows()].join('\n')
        : `:x: AURA investigation failed: ${(err as Error).message}`;
      if (run.stoppedBy) {
        logger.info({ incident: req.incident.id, stoppedBy: run.stoppedBy }, 'investigation stopped');
      } else {
        logger.error({ err, incident: req.incident.id }, 'investigation failed');
      }
      await slack.updateMessage({
        channel: statusMsg.channel,
        ts: statusMsg.ts,
        text,
        blocks: runStatusBlocks({ text }),
      });
      // Aura denies parked approvals on disconnect, but the stream is gone —
      // no approval_completed will arrive, so resolve their messages here.
      await this.cancelPendingApprovals(req.incident.id);
    } finally {
      this.activeRuns.delete(req.incident.id);
    }
  }

  private async cancelPendingApprovals(incidentId: string): Promise<void> {
    for (const [decisionId, pending] of this.pendingApprovals) {
      if (pending.incidentId !== incidentId) continue;
      this.pendingApprovals.delete(decisionId);
      await this.deps.slack.updateMessage({
        channel: pending.channel,
        ts: pending.ts,
        text: `\`${pending.toolName}\` cancelled — run ended`,
        blocks: approvalResolvedBlocks({ toolName: pending.toolName, outcome: 'cancelled' }),
      });
    }
  }

  private buildMessages(req: RunRequest): ChatMessage[] {
    const parent = req.parentNodeId ? req.incident.nodes[req.parentNodeId] : undefined;
    // Parent snapshots are resent verbatim — aura scratchpad pointers live in
    // tool messages and break if history is pruned or rewritten.
    const history = parent ? parent.messages : [];
    return [...history, { role: 'user', content: req.prompt }];
  }
}

// Plain status (no board): single line, rewritten in place. Elapsed time and
// token spend keep it visibly alive between sparse events.
// No clock here by design; totals land on the completion line. Token counts
// appear mid-run only when aura reports them (today its orchestration mode
// reports usage once, at stream end — so real runs usually show them only on
// completion; the sim reports per-step).
function investigatingText(latest?: string, tokensUsed = 0): string {
  const parts = [`:mag: *AURA is working…*`];
  if (latest) parts.push(`_${truncate(latest, 120)}_`);
  if (tokensUsed > 0) parts.push(`~${formatTokens(tokensUsed)} tokens`);
  return parts.join(' — ');
}

function elapsedText(startedAt: number): string {
  const secs = Math.round((Date.now() - startedAt) / 1000);
  return secs >= 60 ? `${Math.floor(secs / 60)}m ${secs % 60}s` : `${secs}s`;
}

function formatTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

// No :white_check_mark: — it sits right next to the approval-resolved message,
// which owns that emoji.
function doneText(startedAt: number, tokensUsed = 0): string {
  const totals = [elapsedText(startedAt)];
  if (tokensUsed > 0) totals.push(`~${formatTokens(tokensUsed)} tokens`);
  return `:mag: *Done* (${totals.join(' · ')})`;
}

function stoppedText(userId: string, startedAt: number, tokensUsed = 0): string {
  const totals = [elapsedText(startedAt)];
  if (tokensUsed > 0) totals.push(`~${formatTokens(tokensUsed)} tokens`);
  return `:octagonal_sign: *Stopped* by <@${userId}> (${totals.join(' · ')})`;
}

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);
