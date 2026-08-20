// Simulated aura: same event shapes as the real connector, filler text instead
// of an LLM. Exercises status updates, resume (per-session run counter), and
// the HITL approval loop — a prompt containing "node log" parks an approval
// until resolveApproval is called (or SIM approval timeout).
import type { AuraConnector, AuraEvent, AuraRunInput } from './connector.js';

const THINKING_STEPS = [
  'Planning investigation: 2 tasks dispatched to cluster_inspector',
  'cluster_inspector: listing pods in ruleprod-apps',
  'cluster_inspector: reading recent events (14 found)',
  'cluster_inspector: pulling logs from suspect pods',
  'Synthesizing findings from worker reports',
];

const FINDINGS = [
  'Root cause: the `cart` deployment is being OOMKilled — memory limit 128Mi is hit under load, container restarts every ~90s.',
  'Root cause: `checkout` cannot reach `orders` — DNS resolves but connections time out; the orders pods show CrashLoopBackOff after a failed migration.',
  'Root cause: elevated 5xx from `catalog` — connection pool exhaustion against Postgres; slow `price-quote` queries are holding connections.',
];

const APPROVAL_TRIGGER = /node ?logs?/i;
const APPROVAL_TIMEOUT_MS = 300_000;

interface PendingApproval {
  resolve: (approved: boolean) => void;
}

export class SimAuraConnector implements AuraConnector {
  readonly name = 'sim';
  private runCounts = new Map<string, number>();
  private pending = new Map<string, PendingApproval>();
  private decisionCounter = 0;

  constructor(private stepMs: number) {}

  async *run(input: AuraRunInput): AsyncGenerator<AuraEvent, void, void> {
    const runNumber = (this.runCounts.get(input.sessionId) ?? 0) + 1;
    this.runCounts.set(input.sessionId, runNumber);

    const lastUser = [...input.messages].reverse().find((m) => m.role === 'user');
    const prompt = typeof lastUser?.content === 'string' ? lastUser.content : '';

    if (runNumber > 1) {
      yield { kind: 'status', text: `Resuming session ${input.sessionId} (run ${runNumber}, ${input.messages.length} messages of history)` };
    }
    let tokens = 0;
    for (const step of THINKING_STEPS) {
      await sleep(this.stepMs);
      yield { kind: 'status', text: step };
      tokens += 4200;
      yield { kind: 'usage', totalTokens: tokens };
    }

    let approvalNote = '';
    if (APPROVAL_TRIGGER.test(prompt)) {
      const decisionId = `sim-decision-${++this.decisionCounter}`;
      // Register BEFORE yielding — the consumer may resolve synchronously on
      // receipt (sticky decisions), before this generator resumes.
      const decision = this.awaitDecision(decisionId);
      yield { kind: 'approval_pending', decisionId, toolName: 'nodes_log', args: { name: 'ip-10-0-1-23.ec2.internal', query: ['kubelet'] } };
      const approved = await decision;
      yield { kind: 'approval_completed', decisionId, outcome: approved ? 'approved' : 'denied' };
      if (!approved) {
        yield { kind: 'final', text: `The \`nodes_log\` call was denied, so I stopped there.\n\n${pick(FINDINGS, runNumber)}\n\n_(simulated response, run ${runNumber})_` };
        return;
      }
      await sleep(this.stepMs);
      yield { kind: 'status', text: 'cluster_inspector: reading kubelet logs from approved node' };
      // Real aura fans one request into per-node calls, each gated — this
      // second approval exercises the bridge's sticky-decision handling.
      const decisionId2 = `sim-decision-${++this.decisionCounter}`;
      const decision2 = this.awaitDecision(decisionId2);
      yield { kind: 'approval_pending', decisionId: decisionId2, toolName: 'nodes_log', args: { name: 'ip-10-0-2-41.ec2.internal', query: ['kubelet'] } };
      const approved2 = await decision2;
      yield { kind: 'approval_completed', decisionId: decisionId2, outcome: approved2 ? 'approved' : 'denied' };
      approvalNote = 'Node kubelet logs confirm the container restarts line up with memory-cgroup OOM events.\n\n';
    }

    await sleep(this.stepMs);
    yield {
      kind: 'final',
      text: `${approvalNote}${pick(FINDINGS, runNumber)}\n\nSuggested next step: raise the memory limit or fix the leak; happy to dig further.\n\n_(simulated response, run ${runNumber}, prompt was: "${truncate(prompt, 120)}")_`,
    };
  }

  async resolveApproval(decisionId: string, approved: boolean): Promise<boolean> {
    const pending = this.pending.get(decisionId);
    if (!pending) return false;
    this.pending.delete(decisionId);
    pending.resolve(approved);
    return true;
  }

  private awaitDecision(decisionId: string): Promise<boolean> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(decisionId);
        resolve(false);
      }, APPROVAL_TIMEOUT_MS);
      timer.unref?.();
      this.pending.set(decisionId, {
        resolve: (approved) => {
          clearTimeout(timer);
          resolve(approved);
        },
      });
    });
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const pick = <T>(arr: T[], seed: number): T => arr[seed % arr.length] as T;
const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);
