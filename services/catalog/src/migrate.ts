/**
 * Boot-time migration: idempotent DDL plus seed upserts, run under a
 * pg_advisory_lock so multiple replicas never race. Touches ONLY the
 * `catalog` schema.
 */

import type { Pool, PoolClient } from 'pg';
import type { Logger } from 'pino';
import { SEED_CATEGORIES, SEED_PRODUCTS } from './seed-data.js';

/** Arbitrary but stable advisory-lock key for the catalog migrator. */
const ADVISORY_LOCK_KEY = 74_101_001;

const DDL = `
CREATE SCHEMA IF NOT EXISTS catalog;

CREATE TABLE IF NOT EXISTS catalog.categories (
  slug        text PRIMARY KEY,
  name        text NOT NULL,
  subtitle    text NOT NULL,
  image       text NOT NULL,
  sort_order  int  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS catalog.products (
  slug            text PRIMARY KEY,
  category        text NOT NULL REFERENCES catalog.categories(slug),
  title           text NOT NULL,
  spec_line       text NOT NULL,
  description     text NOT NULL,
  material        text NOT NULL,
  graduation      text NOT NULL,
  finish          text NOT NULL,
  thickness       text NOT NULL,
  tolerance       text NOT NULL,
  made_in         text NOT NULL,
  images          text[] NOT NULL,
  badge           text NULL CHECK (badge IN ('best_seller', 'low_stock')),
  popularity      int NOT NULL DEFAULT 0,
  rating_average  numeric(3, 2) NOT NULL DEFAULT 0,
  rating_count    int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_category_idx ON catalog.products (category);
CREATE INDEX IF NOT EXISTS products_popularity_idx ON catalog.products (popularity DESC);

CREATE TABLE IF NOT EXISTS catalog.variants (
  sku           text PRIMARY KEY,
  product_slug  text NOT NULL REFERENCES catalog.products(slug) ON DELETE CASCADE,
  label         text NOT NULL,
  length        text NOT NULL,
  price_cents   int  NOT NULL CHECK (price_cents >= 0),
  stock         int  NOT NULL CHECK (stock >= 0),
  sort_order    int  NOT NULL DEFAULT 0,
  is_default    boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS variants_product_idx ON catalog.variants (product_slug);
CREATE INDEX IF NOT EXISTS variants_length_idx ON catalog.variants (length);
CREATE UNIQUE INDEX IF NOT EXISTS variants_one_default_idx
  ON catalog.variants (product_slug) WHERE is_default;

CREATE TABLE IF NOT EXISTS catalog.bulk_tiers (
  sku              text NOT NULL REFERENCES catalog.variants(sku) ON DELETE CASCADE,
  min_qty          int  NOT NULL CHECK (min_qty > 1),
  unit_price_cents int  NOT NULL CHECK (unit_price_cents >= 0),
  PRIMARY KEY (sku, min_qty)
);

CREATE TABLE IF NOT EXISTS catalog.sales (
  product_slug text NOT NULL REFERENCES catalog.products(slug) ON DELETE CASCADE,
  percent_off  numeric(5, 2) NOT NULL CHECK (percent_off > 0 AND percent_off < 100),
  starts_at    timestamptz NOT NULL,
  ends_at      timestamptz NOT NULL CHECK (ends_at > starts_at),
  PRIMARY KEY (product_slug, starts_at)
);

CREATE TABLE IF NOT EXISTS catalog.reviews (
  product_slug text NOT NULL REFERENCES catalog.products(slug) ON DELETE CASCADE,
  position     int  NOT NULL,
  headline     text NOT NULL,
  body         text NOT NULL,
  author       text NOT NULL,
  verified     boolean NOT NULL DEFAULT false,
  PRIMARY KEY (product_slug, position)
);
`;

async function seed(client: PoolClient): Promise<void> {
  for (const category of SEED_CATEGORIES) {
    await client.query(
      `INSERT INTO catalog.categories (slug, name, subtitle, image, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (slug) DO UPDATE
         SET name = EXCLUDED.name, subtitle = EXCLUDED.subtitle,
             image = EXCLUDED.image, sort_order = EXCLUDED.sort_order`,
      [category.slug, category.name, category.subtitle, category.image, category.sortOrder],
    );
  }

  for (const product of SEED_PRODUCTS) {
    await client.query(
      `INSERT INTO catalog.products
         (slug, category, title, spec_line, description, material, graduation,
          finish, thickness, tolerance, made_in, images, badge, popularity,
          rating_average, rating_count, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       ON CONFLICT (slug) DO UPDATE SET
         category = EXCLUDED.category, title = EXCLUDED.title,
         spec_line = EXCLUDED.spec_line, description = EXCLUDED.description,
         material = EXCLUDED.material, graduation = EXCLUDED.graduation,
         finish = EXCLUDED.finish, thickness = EXCLUDED.thickness,
         tolerance = EXCLUDED.tolerance, made_in = EXCLUDED.made_in,
         images = EXCLUDED.images, badge = EXCLUDED.badge,
         popularity = EXCLUDED.popularity, rating_average = EXCLUDED.rating_average,
         rating_count = EXCLUDED.rating_count, created_at = EXCLUDED.created_at`,
      [
        product.slug,
        product.category,
        product.title,
        product.specLine,
        product.description,
        product.material,
        product.graduation,
        product.finish,
        product.thickness,
        product.tolerance,
        product.madeIn,
        product.images,
        product.badge ?? null,
        product.popularity,
        product.ratingAverage,
        product.ratingCount,
        product.createdAt,
      ],
    );

    for (const [index, variant] of product.variants.entries()) {
      await client.query(
        `INSERT INTO catalog.variants
           (sku, product_slug, label, length, price_cents, stock, sort_order, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (sku) DO UPDATE SET
           product_slug = EXCLUDED.product_slug, label = EXCLUDED.label,
           length = EXCLUDED.length, price_cents = EXCLUDED.price_cents,
           stock = EXCLUDED.stock, sort_order = EXCLUDED.sort_order,
           is_default = EXCLUDED.is_default`,
        [
          variant.sku,
          product.slug,
          variant.label,
          variant.length,
          variant.priceCents,
          variant.stock,
          index,
          index === 0,
        ],
      );

      // Replace tiers wholesale so removed seed tiers do not linger.
      await client.query('DELETE FROM catalog.bulk_tiers WHERE sku = $1', [variant.sku]);
      for (const tier of variant.tiers) {
        await client.query(
          `INSERT INTO catalog.bulk_tiers (sku, min_qty, unit_price_cents)
           VALUES ($1, $2, $3)
           ON CONFLICT (sku, min_qty) DO UPDATE SET unit_price_cents = EXCLUDED.unit_price_cents`,
          [variant.sku, tier.minQty, tier.unitPriceCents],
        );
      }
    }

    await client.query('DELETE FROM catalog.sales WHERE product_slug = $1', [product.slug]);
    for (const sale of product.sales ?? []) {
      await client.query(
        `INSERT INTO catalog.sales (product_slug, percent_off, starts_at, ends_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (product_slug, starts_at) DO UPDATE
           SET percent_off = EXCLUDED.percent_off, ends_at = EXCLUDED.ends_at`,
        [product.slug, sale.percentOff, sale.startsAt, sale.endsAt],
      );
    }

    await client.query('DELETE FROM catalog.reviews WHERE product_slug = $1', [product.slug]);
    for (const [index, review] of product.reviews.entries()) {
      await client.query(
        `INSERT INTO catalog.reviews (product_slug, position, headline, body, author, verified)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (product_slug, position) DO UPDATE SET
           headline = EXCLUDED.headline, body = EXCLUDED.body,
           author = EXCLUDED.author, verified = EXCLUDED.verified`,
        [product.slug, index, review.headline, review.body, review.author, review.verified],
      );
    }
  }
}

/** Apply DDL + seed under an advisory lock. Safe to run from every replica. */
export async function migrate(pool: Pool, logger: Logger): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);
    try {
      await client.query(DDL);
      await client.query('BEGIN');
      try {
        await seed(client);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
      logger.info(
        { categories: SEED_CATEGORIES.length, products: SEED_PRODUCTS.length },
        'catalog migration applied',
      );
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]);
    }
  } finally {
    client.release();
  }
}
