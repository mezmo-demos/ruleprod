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

export type AuraEvent =
  | { kind: 'status'; text: string }
  | { kind: 'approval_pending'; decisionId: string; toolName: string; args: unknown }
  | { kind: 'approval_completed'; decisionId: string; outcome: string }
  | { kind: 'final'; text: string }
  | { kind: 'error'; message: string };

export interface AuraRunInput {
  sessionId: string;
  messages: ChatMessage[];
}

export interface AuraConnector {
  readonly name: string;
  /** One investigation run. The iterator ends after 'final' or 'error'. */
  run(input: AuraRunInput): AsyncGenerator<AuraEvent, void, void>;
  /** Answer a parked approval. Resolves false if the decision is unknown/expired. */
  resolveApproval(decisionId: string, approved: boolean, reason?: string): Promise<boolean>;
}
