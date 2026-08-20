# aura-bridge plan

Status: draft, pending Jeff approval. Overview + architecture: [README.md](README.md).

## Settled decisions

- Lives here: `services/aura-bridge/` in ruleprod-apps, loadgen-style (own namespace `aura-bridge`, own AppProject, excluded from shop contracts). TypeScript / Fastify / pino / house conventions.
- Aura API: `/v1/chat/completions` with `stream: true`. Only API with HITL events + fine-grained progress. Bridge owns conversation history (resends `messages[]`). A2A rejected: no approval events reach A2A clients.
- Slack transport: Socket Mode (easiest to debug: bridge runs on a laptop against real Slack with zero ingress/tunnel; no URL challenge, no event signature handling; buttons work over it too). Events API can be swapped in later via manifest change if a "prod-like" story is ever needed.
- Ingress: `aura-bridge.ruleprod.com`, own ALB (separate from shop by preference), PD webhook path only. Wildcard ACM cert + external-dns cover it. Deviates from "frontend is sole internet-exposed service" — update gitops docs when landing.
- HITL: conversational route. Guarded tool for now: `nodes_log` (rare unless explicitly asked). Write-capable MCPs later. gitops branch `aura-hitl` has the values change.
- Terraform: PagerDuty → terramate stack. Slack → NOT Terraform (see below).
- Approver permissions: `authorizeApprover(slackUserId, incident)` in `control/`, returns true today.
- @mentions outside registered incident channels: ignored, log only.
- HITL button messages born in a thread: `reply_broadcast: true`.

## Aura integration facts (from aura-repo source)

- Server: `aura.aura.svc.cluster.local:8080`. No API auth — ClusterIP only, never expose.
- Stream emits `aura.progress`, tool lifecycle, reasoning, `aura.orchestrator.*` (custom events + reasoning already enabled in gitops values), and ungated `aura.approval_requested|pending|completed`.
- Approval decision: `POST /v1/approvals/{decision_id}` `{"approved": bool, "reason"?}` → 204. 404 = expired/resolved.
- Fail-closed: dropping the SSE stream cancels the run and denies parked approvals → bridge holds the connection for the life of each investigation. Bridge restart kills in-flight runs; acceptable.
- `chat_session_id` (via `metadata.chat_session_id`) keys tracing, MCP session header, and — in orchestration mode — the run store. Server stores no chat history for this API.
- Session reuse is LOAD-BEARING in orchestration mode: `{memory_dir}/{session_id}/{run_id}/` — reusing the session id gives new runs read access to prior runs' scratchpad/artifacts, injects the last 3 run manifests into the coordinator preamble (`session_history_turns`), and enables `list_prior_runs`. A new session id keeps only the resent conversation text; every file pointer in it becomes unreadable (path containment).
- Scratchpad file pointers live in the `role: "tool"` messages — never strip or rewrite tool messages when resending history.
- Concurrency: unbounded, isolated per request — but never run two requests on one session id at once (shared MCP session header).
- `STREAMING_TIMEOUT_SECS` default 900 caps an investigation; raise if demos need longer. Leave server `STREAM_INACTIVITY_TIMEOUT_SECS` at 0 (it doesn't suspend during tool calls/parked approvals).

## Conversation model

- Tree per incident. Every Aura answer posted to Slack = node holding the full transcript up to it. Slack `thread_ts` of a reply identifies the parent node.
- New @mention in channel → append to main line (latest node's history + new prompt).
- Thread reply under answer N → fork from node N's snapshot. No summarizing of sibling branches (v1).
- Session ids: ONE per incident (`pd-<incident-id>`), shared by all branches. Forks then keep read access to every prior run's artifacts/manifests (see session semantics above) — exactly the "scratchpad survives resume" behavior we want.
- Overlap: one-session rule forces per-incident FIFO across ALL branches — queue, post "queued behind current investigation". Different incidents run concurrently. Trade-off: a long fork run blocks main-line follow-ups; fine for demos. Fallback if it ever isn't: per-branch session ids, losing shared artifacts on fork.
- State: in-memory tree + JSON snapshot file (emptyDir). SSE constraint makes durable state low-value; Postgres upgrade path exists if ever needed.

## HITL flow

1. `aura.approval_pending` arrives on stream → bridge posts approve/deny buttons (in the thread/channel where the request originated; thread → `reply_broadcast`).
2. Button action → `authorizeApprover()` → `POST /v1/approvals/{decision_id}` → update button message with outcome + actor.
3. `aura.approval_completed` → reflect outcome (incl. `timed_out`).
- Worker approvals confirmed: same events on the main stream (`scope.kind: "worker"` — display metadata, key on `decision_id`), same approvals endpoint. Multiple workers can park concurrently, each with its own `decision_id`.
- Timeout ordering is load-bearing: `hitl.route.timeout_secs (300) < per_call_timeout_secs (360) < STREAMING_TIMEOUT_SECS (900)` — a parked approval blocks inside the worker's per-call timeout, and losing that race kills the worker with a misleading provider-timeout error. Set in gitops `aura-hitl` branch.
- Globs match the bare sanitized tool name (`nodes_log`), never server-prefixed. Two servers exposing the same tool name are indistinguishable to the gate.
- `AURA_HITL_WEBHOOK_SECRET` unset → no HMAC signing needed on the approvals POST. Revisit if set later.

## PagerDuty

- terramate stack `envs/ruleprod/pagerduty/` (strongdm precedent: env-var creds in both GH workflows, provider pinned in `globals.tm.hcl`, kill switch, outputs → SM `ruleprod/pagerduty/*`).
- Resources: service, Events v2 integration (routing key → SM), incident workflow (create Slack channel, post summary, post one-liner to `#incidents`, send webhook to bridge), v3 webhook subscription.
- PD↔Slack extension install is manual OAuth (both sides) before `pagerduty_slack_connection` works.
- Channel id delivery: spec wants incident id + channel id in the webhook. VERIFY whether the workflow webhook action can carry the created channel id; fallback = bridge resolves channel from the captured naming pattern via Slack API.
- v3 webhook signing secret: shown once at subscription create. TF resource doesn't export it usably → create subscription via small script, write secret to SM, `kubectl rollout restart` bridge.
- Bridge gets a PD API token (SM) for fetching incident detail if webhook payloads are thin.

## Slack (no Terraform)

Post-setup, a Slack TF provider would only manage channels/usergroups — app config isn't TF-able (manifest API + app-configuration token). One channel, rarely changing → not worth a provider.

- App-as-code: `manifest.yaml` checked in here + tiny apply script (uses app config token). Socket Mode enabled, bot scopes: `app_mentions:read`, `chat:write`, `channels:read`, `channels:history`, `channels:join`.
- Manual, once: create app from manifest, install (one click) → bot token + app-level token → SM `ruleprod/slack/aura-bridge` (aura/llm precedent: hand-created SM entries are fine for third-party creds).
- `#incidents`: create manually (or one-line script).
- Future per-demo Slack config (temp channels etc.) → demo-scenario TF can adopt a provider then; nothing forecloses it.

## Terraform organization (general)

- Long-lived SaaS config → terramate stacks. Colleague/token story: providers only need creds when their stack is included in a run. Scope local runs (`-C envs/ruleprod/<stack>` or tags) and AWS-only work never touches PD creds; CI has secrets so full plans still gate PRs. strongdm already works this way (`SDM_API_*`). Escape hatch: kill switch. Tag the stack `["saas", "ruleprod", "pagerduty"]` (not `aws`) so `--tags aws` skips it.
- Demo-scenario temp config → plain TF root inside the scenario (`demo_root/tf/`), own state, reads long-lived outputs via `terraform_remote_state` (key `terramate/envs/ruleprod/<c>/terraform.tfstate`). May read, never mutate, long-lived resources. `reset.sh` destroys.

## Deploy

- gitops: AppProject `aura-bridge` (loadgen precedent) + `workloads/services/aura-bridge/` (deployment, service, ingress, networkpolicy?) + pointer in `clusters/ruleprod/services/`. `selfHeal: true` — tooling, not drift-demo material.
- Ingress: `aura-bridge.ruleprod.com`, frontend's ALB annotations minus nothing, healthcheck `/healthz`. Route: `POST /webhooks/pagerduty` (signature-verified).
- Secrets: ExternalSecrets in `platform-secrets/` (explicit `metadata.namespace: aura-bridge`) for `ruleprod/slack/aura-bridge`, `ruleprod/pagerduty/webhook`, `ruleprod/pagerduty/api`.
- ECR: add `aura-bridge` to the terramate `ecr` stack service list (not manual).
- CI: two `build.yml` edits (paths-filter + bash list; mind the trailing-`&&` trap on the last list line). Auto gitops bump PR works once the deployment manifest exists.
- Runtime: port 3000, `/healthz` + `/readyz`, `node --import @ruleprod/telemetry/register`, `createLogger('aura-bridge')`, catalog-shaped two-stage Dockerfile, arm64.

## Build order

1. Skeleton + sim connector + TUI + tests — fully local, no cloud deps.
2. terramate: `pagerduty` stack (merged disabled) + `ecr` list edit.
3. Slack: manifest apply → install → tokens to SM; create `#incidents`; install PD Slack extension → capture channel naming pattern.
4. PD TF: service + Events v2 + incident workflow; flip stack on.
5. Deploy bridge: CI edits, gitops (AppProject, workloads, pointer, ingress, ExternalSecrets).
6. Script: PD v3 webhook subscription → secret to SM → rollout restart.
7. Merge gitops `aura-hitl`.
8. E2E: real incident → investigation → follow-up → thread fork → `nodes_log` HITL → approve.

## Verify during build

- PD workflow webhook payload: can it carry the Slack channel id?
- Docs on land: root README routing lines, gitops "sole internet-exposed" claim, MEMORY.md contracts (SM paths, channel naming pattern, aura svc URL).

## Naming

`aura-bridge` — "bridge" is real incident vocabulary (the incident bridge). Rejected: aura-dispatch, aura-relay, warroom. Dir name = ECR repo = OTEL_SERVICE_NAME = gitops path.
