/**
 * Pure cart-line logic: same-sku merging for add, rekey/restore merges, and
 * save-for-later / move-to-cart planning. No IO — the service layer executes plans.
 */
import type { StoredLine } from '../types.js';

const bucketKey = (line: Pick<StoredLine, 'sku' | 'savedForLater'>): string =>
  `${line.savedForLater ? 'saved' : 'active'}:${line.sku}`;

export type AddPlan =
  | { kind: 'insert'; line: StoredLine }
  | { kind: 'merge'; id: string; qty: number };

/**
 * Adding a sku merges onto an existing *active* line of the same sku by summing
 * quantities; otherwise it becomes a new active line. Saved-for-later lines of
 * the same sku are never touched by an add.
 */
export function planAdd(
  lines: readonly StoredLine[],
  sku: string,
  qty: number,
  newId: string,
  now: string,
): AddPlan {
  const existing = lines.find((l) => !l.savedForLater && l.sku === sku);
  if (existing) {
    return { kind: 'merge', id: existing.id, qty: existing.qty + qty };
  }
  return { kind: 'insert', line: { id: newId, sku, qty, savedForLater: false, addedAt: now } };
}

/**
 * Merge `incoming` lines into `target` (rekey and saved-cart restore/merge).
 * Same sku in the same bucket (active vs saved-for-later) sums quantities and
 * keeps the target line's identity (id / addedAt); everything else is appended
 * unchanged. Target order is preserved, then incoming lines in their order.
 */
export function mergeLineSets(
  target: readonly StoredLine[],
  incoming: readonly StoredLine[],
): StoredLine[] {
  const out: StoredLine[] = target.map((l) => ({ ...l }));
  const byBucketSku = new Map(out.map((l) => [bucketKey(l), l] as const));
  for (const line of incoming) {
    const hit = byBucketSku.get(bucketKey(line));
    if (hit) {
      hit.qty += line.qty;
    } else {
      const copy = { ...line };
      out.push(copy);
      byBucketSku.set(bucketKey(copy), copy);
    }
  }
  return out;
}

export type TogglePlan =
  | { kind: 'not_found' }
  | { kind: 'noop' }
  | { kind: 'move'; id: string }
  | { kind: 'merge'; deleteId: string; intoId: string; qty: number };

/**
 * Save-for-later / move-to-cart. Moving a line into a bucket that already holds
 * a line of the same sku merges by summing quantities into the existing line
 * (the unique (cart_key, sku, saved_for_later) constraint requires it).
 * Already-in-place is a no-op, keeping the endpoints idempotent.
 */
export function planToggle(
  lines: readonly StoredLine[],
  lineId: string,
  toSaved: boolean,
): TogglePlan {
  const line = lines.find((l) => l.id === lineId);
  if (!line) return { kind: 'not_found' };
  if (line.savedForLater === toSaved) return { kind: 'noop' };
  const counterpart = lines.find((l) => l.sku === line.sku && l.savedForLater === toSaved);
  if (counterpart) {
    return {
      kind: 'merge',
      deleteId: line.id,
      intoId: counterpart.id,
      qty: counterpart.qty + line.qty,
    };
  }
  return { kind: 'move', id: line.id };
}
