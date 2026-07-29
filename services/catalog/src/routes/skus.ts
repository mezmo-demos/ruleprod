import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import type { SkuInfo } from '@ruleprod/contracts';
import { notFound } from '../errors.js';

export function registerSkuRoutes(app: FastifyInstance, pool: Pool): void {
  app.get<{ Params: { sku: string } }>('/api/skus/:sku', async (request): Promise<SkuInfo> => {
    const { sku } = request.params;
    const result = await pool.query<SkuInfo>(
      `SELECT v.sku,
              p.slug,
              p.title,
              v.label AS "variantLabel",
              p.spec_line AS "specLine",
              p.images[1] AS image,
              v.price_cents AS "priceCents",
              v.stock
       FROM catalog.variants v
       JOIN catalog.products p ON p.slug = v.product_slug
       WHERE v.sku = $1`,
      [sku],
    );
    const row = result.rows[0];
    if (!row) throw notFound(`No sku "${sku}"`);
    return row;
  });
}
