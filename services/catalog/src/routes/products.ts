import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import type {
  Badge,
  BulkTier,
  CategorySlug,
  Facets,
  Product,
  ProductCard,
  ProductListResponse,
  Review,
  Variant,
} from '@ruleprod/contracts';
import { GRADUATIONS, LENGTHS, MATERIALS } from '@ruleprod/contracts';
import { notFound } from '../errors.js';
import {
  FROM_CLAUSE,
  buildCountQuery,
  buildFacetQueries,
  buildListQuery,
  parseListQuery,
} from '../search.js';

interface CardRow {
  slug: string;
  title: string;
  specLine: string;
  image: string;
  badge: Badge | null;
  priceCents: number;
  stock: number;
  bulkMinQty: number | null;
  bulkUnitPriceCents: number | null;
}

function toCard(row: CardRow): ProductCard {
  const card: ProductCard = {
    slug: row.slug,
    title: row.title,
    specLine: row.specLine,
    image: row.image,
    priceCents: row.priceCents,
    stock: row.stock,
    bulk:
      row.bulkMinQty !== null && row.bulkUnitPriceCents !== null
        ? { minQty: row.bulkMinQty, unitPriceCents: row.bulkUnitPriceCents }
        : null,
  };
  if (row.badge !== null) card.badge = row.badge;
  return card;
}

/** Full vocab in vocab order, zero counts included, so the filter rail is stable. */
function withVocabCounts(
  vocab: readonly string[],
  rows: { value: string; count: number }[],
): { value: string; count: number }[] {
  const counts = new Map(rows.map((row) => [row.value, row.count]));
  return vocab.map((value) => ({ value, count: counts.get(value) ?? 0 }));
}

const CARD_SELECT = `SELECT
  p.slug,
  p.title,
  p.spec_line AS "specLine",
  p.images[1] AS image,
  p.badge,
  dv.price_cents AS "priceCents",
  dv.stock,
  lt.min_qty AS "bulkMinQty",
  lt.unit_price_cents AS "bulkUnitPriceCents"
${FROM_CLAUSE}
LEFT JOIN LATERAL (
  SELECT t.min_qty, t.unit_price_cents
  FROM catalog.bulk_tiers t
  WHERE t.sku = dv.sku
  ORDER BY t.min_qty ASC
  LIMIT 1
) lt ON true`;

export function registerProductRoutes(app: FastifyInstance, pool: Pool): void {
  app.get('/api/products', async (request): Promise<ProductListResponse> => {
    const params = parseListQuery(request.query as Record<string, unknown>);
    const listQuery = buildListQuery(params);
    const countQuery = buildCountQuery(params);
    const facetQueries = buildFacetQueries(params);

    const [list, count, materials, graduations, lengths, price] = await Promise.all([
      pool.query<CardRow>(listQuery.text, listQuery.values),
      pool.query<{ total: number }>(countQuery.text, countQuery.values),
      pool.query<{ value: string; count: number }>(
        facetQueries.materials.text,
        facetQueries.materials.values,
      ),
      pool.query<{ value: string; count: number }>(
        facetQueries.graduations.text,
        facetQueries.graduations.values,
      ),
      pool.query<{ value: string; count: number }>(
        facetQueries.lengths.text,
        facetQueries.lengths.values,
      ),
      pool.query<{ minCents: number; maxCents: number }>(
        facetQueries.price.text,
        facetQueries.price.values,
      ),
    ]);

    const facets: Facets = {
      materials: withVocabCounts(MATERIALS, materials.rows),
      lengths: withVocabCounts(LENGTHS, lengths.rows),
      graduations: withVocabCounts(GRADUATIONS, graduations.rows),
      price: price.rows[0] ?? { minCents: 0, maxCents: 0 },
    };

    return {
      products: list.rows.map(toCard),
      total: count.rows[0]?.total ?? 0,
      page: params.page,
      perPage: params.perPage,
      facets,
    };
  });

  app.get<{ Params: { slug: string } }>('/api/products/:slug', async (request): Promise<Product> => {
    const { slug } = request.params;

    interface ProductRow {
      slug: string;
      category: CategorySlug;
      title: string;
      specLine: string;
      description: string;
      images: string[];
      badge: Badge | null;
      material: string;
      graduation: string;
      finish: string;
      thickness: string;
      tolerance: string;
      madeIn: string;
      ratingAverage: number;
      ratingCount: number;
    }
    interface VariantRow {
      sku: string;
      label: string;
      priceCents: number;
      stock: number;
      isDefault: boolean;
    }

    const productResult = await pool.query<ProductRow>(
      `SELECT slug, category, title, spec_line AS "specLine", description, images, badge,
              material, graduation, finish, thickness, tolerance, made_in AS "madeIn",
              rating_average::float8 AS "ratingAverage", rating_count AS "ratingCount"
       FROM catalog.products WHERE slug = $1`,
      [slug],
    );
    const product = productResult.rows[0];
    if (!product) throw notFound(`No product with slug "${slug}"`);

    const [variantResult, reviewResult] = await Promise.all([
      pool.query<VariantRow>(
        `SELECT sku, label, price_cents AS "priceCents", stock, is_default AS "isDefault"
         FROM catalog.variants WHERE product_slug = $1 ORDER BY sort_order ASC`,
        [slug],
      ),
      pool.query<Review>(
        `SELECT headline, body, author, verified
         FROM catalog.reviews WHERE product_slug = $1 ORDER BY position ASC`,
        [slug],
      ),
    ]);

    const skus = variantResult.rows.map((row) => row.sku);
    const tierResult = await pool.query<BulkTier & { sku: string }>(
      `SELECT sku, min_qty AS "minQty", unit_price_cents AS "unitPriceCents"
       FROM catalog.bulk_tiers WHERE sku = ANY($1) ORDER BY min_qty ASC`,
      [skus],
    );
    const tiersBySku = new Map<string, BulkTier[]>();
    for (const tier of tierResult.rows) {
      const list = tiersBySku.get(tier.sku) ?? [];
      list.push({ minQty: tier.minQty, unitPriceCents: tier.unitPriceCents });
      tiersBySku.set(tier.sku, list);
    }

    const variants: Variant[] = variantResult.rows.map((row) => ({
      sku: row.sku,
      label: row.label,
      priceCents: row.priceCents,
      stock: row.stock,
      tiers: tiersBySku.get(row.sku) ?? [],
    }));

    const defaultVariant = variantResult.rows.find((row) => row.isDefault) ?? variantResult.rows[0];
    if (!defaultVariant) throw notFound(`Product "${slug}" has no variants`);
    const defaultTiers = tiersBySku.get(defaultVariant.sku) ?? [];
    const primaryImage = product.images[0] ?? '';

    const full: Product = {
      slug: product.slug,
      title: product.title,
      specLine: product.specLine,
      image: primaryImage,
      priceCents: defaultVariant.priceCents,
      stock: defaultVariant.stock,
      bulk: defaultTiers[0] ?? null,
      category: product.category,
      description: product.description,
      images: product.images,
      specs: {
        material: product.material,
        finish: product.finish,
        thickness: product.thickness,
        graduation: product.graduation,
        tolerance: product.tolerance,
        madeIn: product.madeIn,
      },
      rating: { average: product.ratingAverage, count: product.ratingCount },
      reviews: reviewResult.rows,
      variants,
      defaultSku: defaultVariant.sku,
    };
    if (product.badge !== null) full.badge = product.badge;
    return full;
  });

  app.get<{ Params: { slug: string } }>('/api/products/:slug/related', async (request) => {
    const { slug } = request.params;
    const categoryResult = await pool.query<{ category: string }>(
      'SELECT category FROM catalog.products WHERE slug = $1',
      [slug],
    );
    const row = categoryResult.rows[0];
    if (!row) throw notFound(`No product with slug "${slug}"`);

    const related = await pool.query<CardRow>(
      `${CARD_SELECT}
       WHERE p.category = $1 AND p.slug <> $2
       ORDER BY p.popularity DESC, p.slug ASC
       LIMIT 4`,
      [row.category, slug],
    );
    return { products: related.rows.map(toCard) };
  });
}
