// Approval permission gate. Deliberately allow-all for now — the mechanism is
// what matters: every approve/deny click flows through here, so tightening it
// later (Slack usergroup lookup, per-incident responder list) is one function.
import type { Incident } from './store.js';

export function authorizeApprover(_slackUserId: string, _incident: Incident | undefined): boolean {
  return true;
}
