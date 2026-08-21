# aura-bridge

Incident-manager service: PagerDuty → Aura → Slack. Demo/platform tooling, not part of the ruler shop — own namespace, no entry in `docs/CONTRACTS.md` (loadgen precedent).

## What the demo looks like when done

1. PagerDuty incident triggers. PD automation: dedicated Slack incident channel + incident summary in it, one-liner in `#incidents` linking the channel, webhook to aura-bridge.
2. aura-bridge posts "AURA is investigating" in the incident channel, live-edits it with Aura's progress (thinking/tool events), posts the full answer when done.
3. Human @mentions the bot with a follow-up: in-channel message resumes the investigation; a thread reply under an earlier answer forks from that answer's context. Loop repeats.
4. A follow-up requiring a guarded action trips Aura HITL: bridge posts approve/deny buttons (thread messages broadcast to channel); decision resumes the run.

## Architecture

```
PagerDuty ─webhook─▶ ┌────────────── aura-bridge ──────────────┐      ┌──────┐
                     │ triggers ─▶ control ─▶ aura connector   │─SSE─▶│ aura │
Slack ◀──Web API──── │              │         (real | sim)     │      └──────┘
      ─Socket Mode─▶ │         admin API ◀── tools/tui.ts      │
                     └─────────────────────────────────────────┘
```

- `triggers/` — inbound: PD v3 webhook (signature-verified), Slack Socket Mode events (mentions, button actions). Never business logic.
- `control/` — conversation tree per incident, per-branch FIFO queue, investigation lifecycle, approver gate (stubbed allow-all, mechanism in place).
- `aura/` — `AuraConnector` interface; `aura-http.ts` (completions SSE) and `aura-sim.ts` (canned thinking steps + filler text, no LLM). Swap via `AURA_MODE=real|sim` or admin API.
- `outbound/` — Slack Web API, PagerDuty API clients.
- `admin/` — localhost-only API: inject fake PD webhook, send test Slack messages/approvals, toggle sim.
- `tools/tui.ts` — standalone TUI driving the admin API. Local: `npm run tui -w @ruleprod/aura-bridge`. In-cluster: `kubectl exec -n aura-bridge -it deploy/aura-bridge -- node dist/tui` (note: namespace and deployment name may vary).

Each layer is independently exercisable: test a Slack post without Aura, replay a PD webhook without an incident, run a full investigation against the simulator without tokens.

Plan, decisions, build order: [PLAN.md](PLAN.md).
`build-reference/` (gitignored) — prior-art clones: `mezmo-srebot/{sre-bot,sre-agent}`.
