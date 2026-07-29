import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import type { BulkTier, PriceQuote, QuotedLine } from '@ruleprod/contracts';
import { invalidRequest } from '../errors.js';
import { activeSalePercent, priceLine, summarize, type SaleWindow } from '../pricing.js';

interface QuoteRequestLine {
  sku: string;
  qty: number;
}

function parseQuoteBody(body: unknown): QuoteRequestLine[] {
  if (typeof body !== 'object' || body === null || !Array.isArray((body as { lines?: unknown }).lines)) {
    throw invalidRequest(422, 'Body must be { lines: [{ sku, qty }] }');
  }
  const rawLines = (body as { lines: unknown[] }).lines;
  return rawLines.map((raw, index) => {
    if (typeof raw !== 'object' || raw === null) {
      throw invalidRequest(422, `lines[${index}] must be an object with sku and qty`);
    }
    const { sku, qty } = raw as { sku?: unknown; qty?: unknown };
    if (typeof sku !== 'string' || sku.length === 0) {
      throw invalidRequest(422, `lines[${index}].sku must be a non-empty string`);
    }
    if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1) {
      throw invalidRequest(422, `lines[${index}].qty must be an integer >= 1`);
    }
    return { sku, qty };
  });
}

interface VariantRow {
  sku: string;
  variantLabel: string;
  priceCents: number;
  stock: number;
  slug: string;
  title: string;
  specLine: string;
  image: string;
}

export function registerPriceQuoteRoutes(app: FastifyInstance, pool: Pool): void {
  app.post('/api/price-quote', async (request): Promise<PriceQuote> => {
    const lines = parseQuoteBody(request.body);
    if (lines.length === 0) {
      return { lines: [], subtotalCents: 0, bulkSavingsCents: 0, unitCount: 0 };
    }

    const skus = [...new Set(lines.map((line) => line.sku))];
    const variantResult = await pool.query<VariantRow>(
      `SELECT v.sku,
              v.label AS "variantLabel",
              v.price_cents AS "priceCents",
              v.stock,
              p.slug,
              p.title,
              p.spec_line AS "specLine",
              p.images[1] AS image
       FROM catalog.variants v
       JOIN catalog.products p ON p.slug = v.product_slug
       WHERE v.sku = ANY($1)`,
      [skus],
    );
    const variantsBySku = new Map(variantResult.rows.map((row) => [row.sku, row]));

    const unknown = skus.filter((sku) => !variantsBySku.has(sku));
    if (unknown.length > 0) {
      throw invalidRequest(422, `Unknown sku: ${unknown.join(', ')}`);
    }

    const slugs = [...new Set(variantResult.rows.map((row) => row.slug))];
    const [tierResult, saleResult] = await Promise.all([
      pool.query<BulkTier & { sku: string }>(
        `SELECT sku, min_qty AS "minQty", unit_price_cents AS "unitPriceCents"
         FROM catalog.bulk_tiers WHERE sku = ANY($1) ORDER BY min_qty ASC`,
        [skus],
      ),
      pool.query<{ productSlug: string; percentOff: string; startsAt: Date; endsAt: Date }>(
        `SELECT product_slug AS "productSlug", percent_off AS "percentOff",
                starts_at AS "startsAt", ends_at AS "endsAt"
         FROM catalog.sales WHERE product_slug = ANY($1)`,
        [slugs],
      ),
    ]);

    const tiersBySku = new Map<string, BulkTier[]>();
    for (const tier of tierResult.rows) {
      const list = tiersBySku.get(tier.sku) ?? [];
      list.push({ minQty: tier.minQty, unitPriceCents: tier.unitPriceCents });
      tiersBySku.set(tier.sku, list);
    }

    const salesBySlug = new Map<string, SaleWindow[]>();
    for (const sale of saleResult.rows) {
      const list = salesBySlug.get(sale.productSlug) ?? [];
      list.push({
        percentOff: Number(sale.percentOff),
        startsAt: sale.startsAt,
        endsAt: sale.endsAt,
      });
      salesBySlug.set(sale.productSlug, list);
    }

    const now = new Date();
    const priced = lines.map((line) => {
      const variant = variantsBySku.get(line.sku)!;
      const pricing = priceLine({
        qty: line.qty,
        baseUnitPriceCents: variant.priceCents,
        tiers: tiersBySku.get(line.sku) ?? [],
        salePercentOff: activeSalePercent(salesBySlug.get(variant.slug) ?? [], now),
      });
      const quoted: QuotedLine = {
        sku: line.sku,
        qty: line.qty,
        stock: variant.stock,
        product: {
          slug: variant.slug,
          title: variant.title,
          variantLabel: variant.variantLabel,
          specLine: variant.specLine,
          image: variant.image,
        },
        baseUnitPriceCents: pricing.baseUnitPriceCents,
        unitPriceCents: pricing.unitPriceCents,
        lineTotalCents: pricing.lineTotalCents,
        appliedTier: pricing.appliedTier,
        nextTier: pricing.nextTier,
      };
      return { quoted, pricing, qty: line.qty };
    });

    const totals = summarize(priced);
    return {
      lines: priced.map((line) => line.quoted),
      subtotalCents: totals.subtotalCents,
      bulkSavingsCents: totals.bulkSavingsCents,
      unitCount: totals.unitCount,
    };
  });
}
