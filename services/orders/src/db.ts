import pg from 'pg';
import { dbConfigFromEnv } from '@ruleprod/telemetry';
import type { Logger } from 'pino';

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
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]);
    }
  } finally {
    client.release();
  }
}
