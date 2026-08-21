// AuraConnector: the seam between bridge control logic and aura. Two
// implementations — http.ts (real aura web server) and sim.ts (canned runs,
// no LLM) — so everything downstream is testable without tokens or a cluster.
//
// Contract mirrors aura's /v1/chat/completions SSE semantics: the server is
// stateless per request (full messages[] resent each run), and the session id
// keys aura's orchestration run store — reuse it across runs of one incident,
// never across two concurrent runs.

/** OpenAI-shaped chat message. Extra fields (tool_calls, tool_call_id, ...)
 * must survive round-trips untouched — aura's scratchpad file pointers live in
 * role:"tool" messages. */
export interface ChatMessage {
  role: string;
  content: string | null;
  [key: string]: unknown;
}

/** One row of the live task board: keyed so later events update the actor's
 * live row. Done rows freeze — a later event with the same key (replan waves
 * reuse task ids from 0) starts a new row, so the board reads chronologically. */
export interface BoardLine {
  /** 'coordinator' or 'task-<n>' — the actor this event belongs to. */
  key: string;
  /** Rendered row body, e.g. `Task 0 — github_analyst — SearchCode(page: 1)`. */
  text: string;
  /** Row is final; it stays on the board as the persistent task log. */
  done?: boolean;
}

export type AuraEvent =
  | { kind: 'status'; text: string }
  /** Orchestration task-board row. When present, boards replace plain statuses. */
  | { kind: 'board'; line: BoardLine }
  /** Per-LLM-call token snapshot — a liveness signal during quiet stretches. */
  | { kind: 'usage'; totalTokens: number }
  | { kind: 'approval_pending'; decisionId: string; toolName: string; args: unknown }
  | { kind: 'approval_completed'; decisionId: string; outcome: string }
  | { kind: 'final'; text: string }
  | { kind: 'error'; message: string };

export interface AuraRunInput {
  sessionId: string;
  messages: ChatMessage[];
  /** Abort = the supported stop path: aura fail-closes on stream disconnect
   * (cancels the run and its MCP calls, denies parked approvals). The run
   * iterator then throws; the engine renders it as user-stopped. */
  signal?: AbortSignal;
}

export interface AuraConnector {
  readonly name: string;
  /** One investigation run. The iterator ends after 'final' or 'error'. */
  run(input: AuraRunInput): AsyncGenerator<AuraEvent, void, void>;
  /** Answer a parked approval. Resolves false if the decision is unknown/expired. */
  resolveApproval(decisionId: string, approved: boolean, reason?: string): Promise<boolean>;
}
