/**
 * All SQL for the cart schema. Plain pg, no ORM. Functions accept a Pool or a
 * PoolClient so the service layer can compose them inside transactions.
 */
import type { Pool, PoolClient } from 'pg';
import type { SnapshotLine, StoredLine } from './types.js';

export type Queryable = Pool | PoolClient;

interface LineRow {
  id: string;
  sku: string;
  qty: number;
  saved_for_later: boolean;
  added_at: Date;
}

const lineFromRow = (row: LineRow): StoredLine => ({
  id: row.id,
  sku: row.sku,
  qty: row.qty,
  savedForLater: row.saved_for_later,
  addedAt: row.added_at.toISOString(),
});

export async function withTransaction<T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

// ---------- carts ----------

export async function ensureCart(q: Queryable, key: string): Promise<void> {
  await q.query('INSERT INTO cart.carts (key) VALUES ($1) ON CONFLICT (key) DO NOTHING', [key]);
}

export async function touchCart(q: Queryable, key: string): Promise<void> {
  await q.query('UPDATE cart.carts SET updated_at = now() WHERE key = $1', [key]);
}

export async function deleteCart(q: Queryable, key: string): Promise<void> {
  await q.query('DELETE FROM cart.carts WHERE key = $1', [key]);
}

// ---------- cart lines ----------

export async function getLines(q: Queryable, key: string): Promise<StoredLine[]> {
  const { rows } = await q.query<LineRow>(
    `SELECT id, sku, qty, saved_for_later, added_at
       FROM cart.cart_lines
      WHERE cart_key = $1
      ORDER BY added_at, id`,
    [key],
  );
  return rows.map(lineFromRow);
}

export async function insertLine(q: Queryable, key: string, line: StoredLine): Promise<void> {
  await q.query(
    `INSERT INTO cart.cart_lines (id, cart_key, sku, qty, saved_for_later, added_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [line.id, key, line.sku, line.qty, line.savedForLater, line.addedAt],
  );
}

/** Returns false when the line doesn't exist in this cart. */
export async function setLineQty(
  q: Queryable,
  key: string,
  lineId: string,
  qty: number,
): Promise<boolean> {
  const result = await q.query(
    'UPDATE cart.cart_lines SET qty = $3 WHERE cart_key = $1 AND id = $2',
    [key, lineId, qty],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function setLineSaved(
  q: Queryable,
  key: string,
  lineId: string,
  saved: boolean,
): Promise<boolean> {
  const result = await q.query(
    'UPDATE cart.cart_lines SET saved_for_later = $3 WHERE cart_key = $1 AND id = $2',
    [key, lineId, saved],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function deleteLine(q: Queryable, key: string, lineId: string): Promise<boolean> {
  const result = await q.query('DELETE FROM cart.cart_lines WHERE cart_key = $1 AND id = $2', [
    key,
    lineId,
  ]);
  return (result.rowCount ?? 0) > 0;
}

/** Remove every line (either bucket) whose sku catalog no longer recognizes. */
export async function deleteLinesBySkus(q: Queryable, key: string, skus: string[]): Promise<void> {
  if (skus.length === 0) return;
  await q.query('DELETE FROM cart.cart_lines WHERE cart_key = $1 AND sku = ANY($2)', [key, skus]);
}

export async function clearActiveLines(q: Queryable, key: string): Promise<void> {
  await q.query('DELETE FROM cart.cart_lines WHERE cart_key = $1 AND saved_for_later = false', [
    key,
  ]);
}

export async function deleteAllLines(q: Queryable, key: string): Promise<void> {
  await q.query('DELETE FROM cart.cart_lines WHERE cart_key = $1', [key]);
}

// ---------- saved carts ----------

export interface SavedCartRow {
  id: string;
  name: string;
  itemCount: number;
  totalCents: number;
  savedAt: string;
}

export async function listSavedCarts(q: Queryable, key: string): Promise<SavedCartRow[]> {
  const { rows } = await q.query<{
    id: string;
    name: string;
    item_count: number;
    total_cents: number;
    created_at: Date;
  }>(
    `SELECT id, name, item_count, total_cents, created_at
       FROM cart.saved_carts
      WHERE cart_key = $1
      ORDER BY created_at DESC, id`,
    [key],
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    itemCount: row.item_count,
    totalCents: row.total_cents,
    savedAt: row.created_at.toISOString(),
  }));
}

export async function insertSavedCart(
  client: PoolClient,
  key: string,
  snapshot: { id: string; name: string; itemCount: number; totalCents: number; lines: SnapshotLine[] },
): Promise<void> {
  await client.query(
    `INSERT INTO cart.saved_carts (id, cart_key, name, item_count, total_cents)
     VALUES ($1, $2, $3, $4, $5)`,
    [snapshot.id, key, snapshot.name, snapshot.itemCount, snapshot.totalCents],
  );
  for (const line of snapshot.lines) {
    await client.query(
      'INSERT INTO cart.saved_cart_lines (saved_cart_id, sku, qty) VALUES ($1, $2, $3)',
      [snapshot.id, line.sku, line.qty],
    );
  }
}

/** Null when the saved cart doesn't exist or belongs to a different key. */
export async function getSavedCartLines(
  q: Queryable,
  key: string,
  savedCartId: string,
): Promise<SnapshotLine[] | null> {
  const owned = await q.query('SELECT 1 FROM cart.saved_carts WHERE id = $1 AND cart_key = $2', [
    savedCartId,
    key,
  ]);
  if ((owned.rowCount ?? 0) === 0) return null;
  const { rows } = await q.query<{ sku: string; qty: number }>(
    'SELECT sku, qty FROM cart.saved_cart_lines WHERE saved_cart_id = $1 ORDER BY sku',
    [savedCartId],
  );
  return rows.map(({ sku, qty }) => ({ sku, qty }));
}

export async function deleteSavedCart(
  q: Queryable,
  key: string,
  savedCartId: string,
): Promise<boolean> {
  const result = await q.query('DELETE FROM cart.saved_carts WHERE id = $1 AND cart_key = $2', [
    savedCartId,
    key,
  ]);
  return (result.rowCount ?? 0) > 0;
}

export async function moveSavedCarts(q: Queryable, fromKey: string, toKey: string): Promise<void> {
  await q.query('UPDATE cart.saved_carts SET cart_key = $2 WHERE cart_key = $1', [fromKey, toKey]);
}
