/**
 * Cart operations: load stored lines, mutate via pure plans, then return the
 * full priced cart by joining catalog quotes onto stored lines. Active and
 * saved-for-later buckets are quoted separately so totals cover active only.
 */
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { Logger } from 'pino';
import type { Cart, SavedCartSummary } from '@ruleprod/contracts';
import { AppError } from './errors.js';
import { assembleCart } from './logic/assemble.js';
import { mergeLineSets, planAdd, planToggle } from './logic/lines.js';
import { priceLines, type QuoteFn } from './logic/pricing.js';
import * as repo from './repo.js';
import type { StoredLine } from './types.js';

export type RestoreMode = 'merge' | 'replace';

export class CartService {
  constructor(
    private readonly pool: Pool,
    private readonly quote: QuoteFn,
    private readonly log: Logger,
  ) {}

  // ---------- pricing ----------

  /** Quote stored lines (active and saved separately), dropping unknown skus. */
  private async price(key: string, lines: StoredLine[]): Promise<{ cart: Cart; dropped: string[] }> {
    const active = lines.filter((l) => !l.savedForLater);
    const saved = lines.filter((l) => l.savedForLater);
    const activePriced = await priceLines(active, this.quote);
    const savedPriced = await priceLines(saved, this.quote);
    const dropped = [...new Set([...activePriced.dropped, ...savedPriced.dropped])];
    if (dropped.length > 0) {
      this.log.warn({ key, skus: dropped }, 'dropping lines with skus catalog no longer knows');
      await repo.deleteLinesBySkus(this.pool, key, dropped);
    }
    const keep = (l: StoredLine) => !dropped.includes(l.sku);
    const cart = assembleCart(
      key,
      active.filter(keep),
      saved.filter(keep),
      activePriced.quote,
      savedPriced.quote,
    );
    return { cart, dropped };
  }

  async pricedCart(key: string): Promise<Cart> {
    const lines = await repo.getLines(this.pool, key);
    const { cart } = await this.price(key, lines);
    return cart;
  }

  // ---------- line mutations ----------

  async addLine(key: string, sku: string, qty: number): Promise<Cart> {
    await repo.ensureCart(this.pool, key);
    const lines = await repo.getLines(this.pool, key);
    const plan = planAdd(lines, sku, qty, randomUUID(), new Date().toISOString());
    if (plan.kind === 'merge') {
      await repo.setLineQty(this.pool, key, plan.id, plan.qty);
    } else {
      await repo.insertLine(this.pool, key, plan.line);
    }
    await repo.touchCart(this.pool, key);
    const updated = await repo.getLines(this.pool, key);
    const { cart, dropped } = await this.price(key, updated);
    if (dropped.includes(sku)) {
      throw new AppError('invalid_request', `Unknown sku: ${sku}`);
    }
    return cart;
  }

  async setQty(key: string, lineId: string, qty: number): Promise<Cart> {
    const found = await repo.setLineQty(this.pool, key, lineId, qty);
    if (!found) throw new AppError('not_found', `No line ${lineId} in cart ${key}`);
    await repo.touchCart(this.pool, key);
    return this.pricedCart(key);
  }

  async removeLine(key: string, lineId: string): Promise<Cart> {
    const found = await repo.deleteLine(this.pool, key, lineId);
    if (!found) throw new AppError('not_found', `No line ${lineId} in cart ${key}`);
    await repo.touchCart(this.pool, key);
    return this.pricedCart(key);
  }

  /** Shared by save-for-later (toSaved=true) and move-to-cart (toSaved=false). */
  async toggleSaved(key: string, lineId: string, toSaved: boolean): Promise<Cart> {
    const lines = await repo.getLines(this.pool, key);
    const plan = planToggle(lines, lineId, toSaved);
    if (plan.kind === 'not_found') {
      throw new AppError('not_found', `No line ${lineId} in cart ${key}`);
    }
    if (plan.kind === 'move') {
      await repo.setLineSaved(this.pool, key, plan.id, toSaved);
      await repo.touchCart(this.pool, key);
    } else if (plan.kind === 'merge') {
      await repo.withTransaction(this.pool, async (client) => {
        await repo.setLineQty(client, key, plan.intoId, plan.qty);
        await repo.deleteLine(client, key, plan.deleteId);
        await repo.touchCart(client, key);
      });
    }
    return this.pricedCart(key);
  }

  async clear(key: string): Promise<Cart> {
    await repo.clearActiveLines(this.pool, key);
    await repo.touchCart(this.pool, key);
    return this.pricedCart(key);
  }

  // ---------- saved carts ----------

  async listSavedCarts(key: string): Promise<SavedCartSummary[]> {
    return repo.listSavedCarts(this.pool, key);
  }

  async createSavedCart(key: string, name: string): Promise<Cart> {
    const lines = await repo.getLines(this.pool, key);
    const active = lines.filter((l) => !l.savedForLater);
    if (active.length === 0) {
      throw new AppError('conflict', 'Cart has no active lines to save');
    }
    const { quote, dropped } = await priceLines(active, this.quote);
    if (dropped.length > 0) {
      this.log.warn({ key, skus: dropped }, 'dropping lines with skus catalog no longer knows');
      await repo.deleteLinesBySkus(this.pool, key, dropped);
    }
    if (!quote) {
      throw new AppError('conflict', 'Cart has no active lines to save');
    }
    const kept = active.filter((l) => !dropped.includes(l.sku));
    await repo.withTransaction(this.pool, (client) =>
      repo.insertSavedCart(client, key, {
        id: randomUUID(),
        name,
        itemCount: quote.unitCount,
        totalCents: quote.subtotalCents,
        lines: kept.map(({ sku, qty }) => ({ sku, qty })),
      }),
    );
    return this.pricedCart(key);
  }

  async restoreSavedCart(key: string, savedCartId: string, mode: RestoreMode): Promise<Cart> {
    const snapshot = await repo.getSavedCartLines(this.pool, key, savedCartId);
    if (!snapshot) throw new AppError('not_found', `No saved cart ${savedCartId} for ${key}`);
    const now = new Date().toISOString();
    const incoming: StoredLine[] = snapshot.map((l) => ({
      id: randomUUID(),
      sku: l.sku,
      qty: l.qty,
      savedForLater: false,
      addedAt: now,
    }));
    await repo.withTransaction(this.pool, async (client) => {
      await repo.ensureCart(client, key);
      const current = await repo.getLines(client, key);
      const active = current.filter((l) => !l.savedForLater);
      const merged = mode === 'merge' ? mergeLineSets(active, incoming) : incoming;
      await repo.clearActiveLines(client, key);
      for (const line of merged) {
        await repo.insertLine(client, key, line);
      }
      await repo.touchCart(client, key);
    });
    return this.pricedCart(key);
  }

  async deleteSavedCart(key: string, savedCartId: string): Promise<Cart> {
    const found = await repo.deleteSavedCart(this.pool, key, savedCartId);
    if (!found) throw new AppError('not_found', `No saved cart ${savedCartId} for ${key}`);
    return this.pricedCart(key);
  }

  // ---------- rekey ----------

  /**
   * Guest → persona: move active lines, saved-for-later lines and saved carts
   * onto toKey (merging same-sku lines per bucket by summing qty), then delete
   * the old key entirely.
   */
  async rekey(fromKey: string, toKey: string): Promise<Cart> {
    await repo.withTransaction(this.pool, async (client) => {
      await repo.ensureCart(client, toKey);
      const fromLines = await repo.getLines(client, fromKey);
      const toLines = await repo.getLines(client, toKey);
      const merged = mergeLineSets(toLines, fromLines);
      await repo.deleteAllLines(client, fromKey);
      await repo.deleteAllLines(client, toKey);
      for (const line of merged) {
        await repo.insertLine(client, toKey, line);
      }
      await repo.moveSavedCarts(client, fromKey, toKey);
      await repo.deleteCart(client, fromKey);
      await repo.touchCart(client, toKey);
    });
    this.log.info({ fromKey, toKey }, 'cart rekeyed');
    return this.pricedCart(toKey);
  }
}
