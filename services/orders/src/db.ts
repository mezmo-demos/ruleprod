import pg from 'pg';
import { dbConfigFromEnv } from '@ruleprod/telemetry';
import { findPersona, personaKey } from '@ruleprod/contracts';
import type { Logger } from 'pino';
import { arrivesEstimate } from './domain/businessDays.js';
import {
  SEED_ORDERS,
  deriveTotals,
  seedIdempotencyKey,
  seedOrderId,
  type SeedOrder,
} from './seed-data.js';

const { Pool } = pg;
export type { Pool as PgPool } from 'pg';

/**
 * Advisory lock key for orders migrations — arbitrary but stable constant so
 * multiple replicas serialize their boot migration.
 */
const MIGRATION_LOCK_KEY = 71_04_2026;

const MIGRATION_SQL = `
CREATE SCHEMA IF NOT EXISTS orders;

CREATE SEQUENCE IF NOT EXISTS orders.order_number_seq START WITH 10517;

CREATE TABLE IF NOT EXISTS orders.orders (
  id uuid PRIMARY KEY,
  order_number text NOT NULL UNIQUE,
  user_key text NOT NULL,
  status text NOT NULL DEFAULT 'placed',
  placed_at timestamptz NOT NULL,
  arrives_estimate timestamptz NOT NULL,
  contact jsonb NOT NULL,
  shipping_address jsonb NOT NULL,
  delivery jsonb NOT NULL,
  payment jsonb NOT NULL,
  promo jsonb,
  totals jsonb NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  unit_count integer NOT NULL
);

CREATE INDEX IF NOT EXISTS orders_user_key_idx
  ON orders.orders (user_key);

CREATE INDEX IF NOT EXISTS orders_status_placed_at_idx
  ON orders.orders (status, placed_at);

CREATE TABLE IF NOT EXISTS orders.order_lines (
  order_id uuid NOT NULL REFERENCES orders.orders(id) ON DELETE CASCADE,
  position integer NOT NULL,
  sku text NOT NULL,
  slug text NOT NULL,
  title text NOT NULL,
  variant_label text NOT NULL,
  image text NOT NULL,
  qty integer NOT NULL,
  unit_price_cents integer NOT NULL,
  line_total_cents integer NOT NULL,
  PRIMARY KEY (order_id, position)
);
`;

/** Connection pool from the shared env contract (DATABASE_URL wins over parts). */
export function createPool(): pg.Pool {
  const config = dbConfigFromEnv();
  return config.connectionString
    ? new Pool({ connectionString: config.connectionString })
    : new Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
      });
}

/** Whole days before `now`, at the same wall-clock time. */
function daysBefore(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

/**
 * Insert one seeded persona order. `ON CONFLICT DO NOTHING` on the reserved
 * order number makes this a no-op on every boot after the first, so restarts
 * never duplicate history and never overwrite a status the loop has advanced.
 * Returns true when this boot actually wrote the order.
 */
async function seedOrder(
  client: pg.PoolClient,
  order: SeedOrder,
  now: Date,
): Promise<boolean> {
  const persona = findPersona(order.personaId);
  if (!persona) {
    throw new Error(`seed order ${order.orderNumber} names unknown persona ${order.personaId}`);
  }

  const id = seedOrderId(order.orderNumber);
  const placedAt = daysBefore(now, order.daysAgo);
  const totals = deriveTotals(order);
  const unitCount = order.lines.reduce((sum, line) => sum + line.qty, 0);

  const inserted = await client.query(
    `INSERT INTO orders.orders
       (id, order_number, user_key, status, placed_at, arrives_estimate,
        contact, shipping_address, delivery, payment, promo, totals,
        idempotency_key, unit_count)
     VALUES
       ($1, $2, $3, 'delivered', $4, $5, $6::jsonb, $7::jsonb, $8::jsonb,
        $9::jsonb, $10::jsonb, $11::jsonb, $12, $13)
     ON CONFLICT (order_number) DO NOTHING`,
    [
      id,
      order.orderNumber,
      personaKey(persona.id),
      placedAt.toISOString(),
      arrivesEstimate(placedAt, order.delivery).toISOString(),
      JSON.stringify({ email: persona.email, name: persona.name }),
      JSON.stringify(persona.address),
      JSON.stringify({ method: order.delivery, priceCents: totals.shippingCents }),
      JSON.stringify({ method: order.payment }),
      order.promo === undefined
        ? null
        : JSON.stringify({ code: order.promo.code, discountCents: totals.promoDiscountCents }),
      JSON.stringify({
        subtotalCents: totals.subtotalCents,
        bulkSavingsCents: totals.bulkSavingsCents,
        promoDiscountCents: totals.promoDiscountCents,
        shippingCents: totals.shippingCents,
        taxCents: totals.taxCents,
        totalCents: totals.totalCents,
      }),
      seedIdempotencyKey(order.orderNumber),
      unitCount,
    ],
  );

  if (inserted.rowCount === 0) return false;

  const values: unknown[] = [id];
  const tuples = order.lines.map((line, index) => {
    const base = values.length;
    values.push(
      index + 1,
      line.sku,
      line.slug,
      line.title,
      line.variantLabel,
      line.image,
      line.qty,
      line.unitPriceCents,
      line.unitPriceCents * line.qty,
    );
    return `($1, $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9})`;
  });
  await client.query(
    `INSERT INTO orders.order_lines
       (order_id, position, sku, slug, title, variant_label, image, qty,
        unit_price_cents, line_total_cents)
     VALUES ${tuples.join(', ')}`,
    values,
  );
  return true;
}

/**
 * Idempotent boot migration under pg_advisory_lock so concurrent replicas
 * don't race. Touches only the `orders` schema.
 */
export async function migrate(pool: pg.Pool, log: Logger): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
    try {
      await client.query(MIGRATION_SQL);
      log.info({ schema: 'orders' }, 'migrations applied');

      const now = new Date();
      await client.query('BEGIN');
      try {
        let seeded = 0;
        for (const order of SEED_ORDERS) {
          if (await seedOrder(client, order, now)) seeded += 1;
        }
        await client.query('COMMIT');
        log.info(
          { seeded, total: SEED_ORDERS.length },
          'persona order history seeded',
        );
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]);
    }
  } finally {
    client.release();
  }
}
