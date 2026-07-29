import { describe, expect, it } from 'vitest';
import { mergeLineSets, planAdd, planToggle } from '../src/logic/lines.js';
import { line } from './fixtures.js';

const NOW = '2026-07-29T12:00:00.000Z';
const NEW_ID = '11111111-1111-4111-8111-111111111111';

describe('planAdd (same-sku merge on add)', () => {
  it('merges onto an existing active line of the same sku by summing qty', () => {
    const existing = line({ sku: 'RP-SR-6R4', qty: 10 });
    const plan = planAdd([existing], 'RP-SR-6R4', 5, NEW_ID, NOW);
    expect(plan).toEqual({ kind: 'merge', id: existing.id, qty: 15 });
  });

  it('inserts a new active line when no active line has the sku', () => {
    const other = line({ sku: 'RP-SR-12R4', qty: 2 });
    const plan = planAdd([other], 'RP-SR-6R4', 3, NEW_ID, NOW);
    expect(plan).toEqual({
      kind: 'insert',
      line: { id: NEW_ID, sku: 'RP-SR-6R4', qty: 3, savedForLater: false, addedAt: NOW },
    });
  });

  it('ignores saved-for-later lines of the same sku', () => {
    const saved = line({ sku: 'RP-SR-6R4', qty: 4, savedForLater: true });
    const plan = planAdd([saved], 'RP-SR-6R4', 2, NEW_ID, NOW);
    expect(plan.kind).toBe('insert');
  });
});

describe('mergeLineSets (rekey / restore merge)', () => {
  it('sums qty for same sku in the same bucket, keeping target identity', () => {
    const target = line({ sku: 'RP-SR-6R4', qty: 10 });
    const incoming = line({ sku: 'RP-SR-6R4', qty: 5 });
    const merged = mergeLineSets([target], [incoming]);
    expect(merged).toEqual([{ ...target, qty: 15 }]);
  });

  it('keeps active and saved-for-later buckets separate', () => {
    const targetSaved = line({ sku: 'RP-SR-6R4', qty: 2, savedForLater: true });
    const incomingActive = line({ sku: 'RP-SR-6R4', qty: 3, savedForLater: false });
    const merged = mergeLineSets([targetSaved], [incomingActive]);
    expect(merged).toHaveLength(2);
    expect(merged.map((l) => l.qty)).toEqual([2, 3]);
  });

  it('appends unmatched incoming lines after target lines, preserving order', () => {
    const t1 = line({ sku: 'A', qty: 1 });
    const t2 = line({ sku: 'B', qty: 2 });
    const i1 = line({ sku: 'B', qty: 3 });
    const i2 = line({ sku: 'C', qty: 4 });
    const i3 = line({ sku: 'D', qty: 5 });
    const merged = mergeLineSets([t1, t2], [i1, i2, i3]);
    expect(merged.map((l) => [l.sku, l.qty])).toEqual([
      ['A', 1],
      ['B', 5],
      ['C', 4],
      ['D', 5],
    ]);
    expect(merged[1]!.id).toBe(t2.id);
  });

  it('merges an empty target by taking incoming as-is', () => {
    const incoming = [line({ sku: 'A', qty: 1 }), line({ sku: 'B', qty: 2, savedForLater: true })];
    expect(mergeLineSets([], incoming)).toEqual(incoming);
  });

  it('does not mutate its inputs', () => {
    const target = [line({ sku: 'A', qty: 1 })];
    const incoming = [line({ sku: 'A', qty: 2 })];
    mergeLineSets(target, incoming);
    expect(target[0]!.qty).toBe(1);
    expect(incoming[0]!.qty).toBe(2);
  });
});

describe('planToggle (save-for-later / move-to-cart)', () => {
  it('moves a line when the other bucket has no line with that sku', () => {
    const active = line({ sku: 'A', qty: 2 });
    expect(planToggle([active], active.id, true)).toEqual({ kind: 'move', id: active.id });
  });

  it('merges into the counterpart when the other bucket already has the sku', () => {
    const active = line({ sku: 'A', qty: 2 });
    const saved = line({ sku: 'A', qty: 3, savedForLater: true });
    expect(planToggle([active, saved], active.id, true)).toEqual({
      kind: 'merge',
      deleteId: active.id,
      intoId: saved.id,
      qty: 5,
    });
  });

  it('moving back to cart merges into the active counterpart', () => {
    const active = line({ sku: 'A', qty: 2 });
    const saved = line({ sku: 'A', qty: 3, savedForLater: true });
    expect(planToggle([active, saved], saved.id, false)).toEqual({
      kind: 'merge',
      deleteId: saved.id,
      intoId: active.id,
      qty: 5,
    });
  });

  it('is a no-op when the line is already in the requested bucket', () => {
    const saved = line({ sku: 'A', qty: 1, savedForLater: true });
    expect(planToggle([saved], saved.id, true)).toEqual({ kind: 'noop' });
  });

  it('reports not_found for an unknown line id', () => {
    expect(planToggle([line()], '22222222-2222-4222-8222-222222222222', true)).toEqual({
      kind: 'not_found',
    });
  });
});
