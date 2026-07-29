/**
 * Idempotent boot migrations for the `cart` schema, run under an advisory lock
 * so multiple replicas don't race. Touches only the cart schema.
 */
import type { Pool } from 'pg';
import type { Logger } from 'pino';

/** 'cart' as ascii (0x63617274) — stable app-wide lock id for cart migrations. */
const MIGRATION_LOCK_ID = 1_667_330_676;

const DDL = `
CREATE SCHEMA IF NOT EXISTS cart;

CREATE TABLE IF NOT EXISTS cart.carts (
  key        text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cart.cart_lines (
  id              uuid PRIMARY KEY,
  cart_key        text NOT NULL REFERENCES cart.carts(key) ON DELETE CASCADE,
  sku             text NOT NULL,
  qty             integer NOT NULL CHECK (qty > 0),
  saved_for_later boolean NOT NULL DEFAULT false,
  added_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cart_lines_cart_sku_bucket_uniq UNIQUE (cart_key, sku, saved_for_later)
);

CREATE INDEX IF NOT EXISTS cart_lines_cart_key_idx ON cart.cart_lines (cart_key);

CREATE TABLE IF NOT EXISTS cart.saved_carts (
  id          uuid PRIMARY KEY,
  cart_key    text NOT NULL REFERENCES cart.carts(key) ON DELETE CASCADE,
  name        text NOT NULL,
  item_count  integer NOT NULL,
  total_cents integer NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saved_carts_cart_key_idx ON cart.saved_carts (cart_key);

CREATE TABLE IF NOT EXISTS cart.saved_cart_lines (
  saved_cart_id uuid NOT NULL REFERENCES cart.saved_carts(id) ON DELETE CASCADE,
  sku           text NOT NULL,
  qty           integer NOT NULL CHECK (qty > 0),
  PRIMARY KEY (saved_cart_id, sku)
);
`;

export async function migrate(pool: Pool, log: Logger): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
    try {
      await client.query(DDL);
      log.info('cart schema migrations applied');
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
    }
  } finally {
    client.release();
  }
}
