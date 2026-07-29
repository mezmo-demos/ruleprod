/**
 * Pure query-building for GET /api/products: parsing/validation of the query
 * string, and SQL text/params for the list, count, and facet queries.
 * No DB access here — everything is unit-testable.
 *
 * Facet counts follow standard multi-select semantics: each dimension is
 * counted under every active filter *except its own selection* (and the price
 * bounds ignore the price filter), which is what makes the design's
 * checkbox-with-counts rail usable.
 */

import type { SortKey } from '@ruleprod/contracts';
import { invalidRequest } from './errors.js';

export const SORT_KEYS: readonly SortKey[] = [
  'popular',
  'price_asc',
  'price_desc',
  'newest',
  'name',
];

export const DEFAULT_PER_PAGE = 12;
export const MAX_PER_PAGE = 100;

export interface ListParams {
  category?: string;
  materials: string[];
  lengths: string[];
  graduations: string[];
  priceMinCents?: number;
  priceMaxCents?: number;
  inStock: boolean;
  bulkOnly: boolean;
  q?: string;
  sort: SortKey;
  page: number;
  perPage: number;
}

export interface Sql {
  text: string;
  values: unknown[];
}

export type FacetDimension = 'material' | 'length' | 'graduation' | 'price';

/** Repeatable params arrive as string | string[]; also accept comma-separated. */
function toStringArray(raw: unknown): string[] {
  const parts = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw];
  const out: string[] = [];
  for (const part of parts) {
    for (const piece of String(part).split(',')) {
      const trimmed = piece.trim();
      if (trimmed.length > 0 && !out.includes(trimmed)) out.push(trimmed);
    }
  }
  return out;
}

function toOptionalString(raw: unknown): string | undefined {
  if (raw === undefined) return undefined;
  const value = Array.isArray(raw) ? raw[raw.length - 1] : raw;
  const str = String(value).trim();
  return str.length > 0 ? str : undefined;
}

function toOptionalInt(raw: unknown, name: string): number | undefined {
  const str = toOptionalString(raw);
  if (str === undefined) return undefined;
  const value = Number(str);
  if (!Number.isInteger(value) || value < 0) {
    throw invalidRequest(400, `Query param "${name}" must be a non-negative integer`);
  }
  return value;
}

function toFlag(raw: unknown): boolean {
  const str = toOptionalString(raw);
  return str === '1' || str === 'true';
}

/** Parse + validate the raw query object. Throws 400 invalid_request on bad input. */
export function parseListQuery(raw: Record<string, unknown>): ListParams {
  const sortRaw = toOptionalString(raw['sort']);
  if (sortRaw !== undefined && !SORT_KEYS.includes(sortRaw as SortKey)) {
    throw invalidRequest(
      400,
      `Query param "sort" must be one of: ${SORT_KEYS.join(', ')}`,
    );
  }
  const page = toOptionalInt(raw['page'], 'page') ?? 1;
  if (page < 1) throw invalidRequest(400, 'Query param "page" must be >= 1');
  const perPageRaw = toOptionalInt(raw['per_page'], 'per_page') ?? DEFAULT_PER_PAGE;
  if (perPageRaw < 1) throw invalidRequest(400, 'Query param "per_page" must be >= 1');

  const params: ListParams = {
    materials: toStringArray(raw['material']),
    lengths: toStringArray(raw['length']),
    graduations: toStringArray(raw['graduation']),
    inStock: toFlag(raw['in_stock']),
    bulkOnly: toFlag(raw['bulk_only']),
    sort: (sortRaw as SortKey | undefined) ?? 'popular',
    page,
    perPage: Math.min(perPageRaw, MAX_PER_PAGE),
  };

  const category = toOptionalString(raw['category']);
  if (category !== undefined) params.category = category;
  const priceMinCents = toOptionalInt(raw['price_min'], 'price_min');
  if (priceMinCents !== undefined) params.priceMinCents = priceMinCents;
  const priceMaxCents = toOptionalInt(raw['price_max'], 'price_max');
  if (priceMaxCents !== undefined) params.priceMaxCents = priceMaxCents;
  const q = toOptionalString(raw['q']);
  if (q !== undefined) params.q = q;

  return params;
}

/** Escape LIKE wildcards so user input matches literally. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/**
 * Base FROM clause: every product joined to its default variant `dv`
 * (the card's price/stock and the price sort/filter source).
 */
export const FROM_CLAUSE = `FROM catalog.products p
JOIN catalog.variants dv ON dv.product_slug = p.slug AND dv.is_default`;

interface WhereBuild {
  clauses: string[];
  values: unknown[];
}

/**
 * WHERE fragments for the filter set, numbering placeholders from
 * `values.length + 1`. `exclude` drops one dimension (facet self-exclusion).
 */
export function buildWhere(params: ListParams, exclude?: FacetDimension): WhereBuild {
  const clauses: string[] = [];
  const values: unknown[] = [];
  const next = () => `$${values.length + 1}`;

  if (params.category !== undefined) {
    clauses.push(`p.category = ${next()}`);
    values.push(params.category);
  }
  if (exclude !== 'material' && params.materials.length > 0) {
    clauses.push(`p.material = ANY(${next()})`);
    values.push(params.materials);
  }
  if (exclude !== 'graduation' && params.graduations.length > 0) {
    clauses.push(`p.graduation = ANY(${next()})`);
    values.push(params.graduations);
  }
  if (exclude !== 'length' && params.lengths.length > 0) {
    clauses.push(
      `EXISTS (SELECT 1 FROM catalog.variants vf WHERE vf.product_slug = p.slug AND vf.length = ANY(${next()}))`,
    );
    values.push(params.lengths);
  }
  if (exclude !== 'price' && params.priceMinCents !== undefined) {
    clauses.push(`dv.price_cents >= ${next()}`);
    values.push(params.priceMinCents);
  }
  if (exclude !== 'price' && params.priceMaxCents !== undefined) {
    clauses.push(`dv.price_cents <= ${next()}`);
    values.push(params.priceMaxCents);
  }
  if (params.inStock) {
    clauses.push('dv.stock > 0');
  }
  if (params.bulkOnly) {
    clauses.push('EXISTS (SELECT 1 FROM catalog.bulk_tiers bt WHERE bt.sku = dv.sku)');
  }
  if (params.q !== undefined) {
    const pattern = `%${escapeLike(params.q)}%`;
    const ph = next();
    clauses.push(`(p.title ILIKE ${ph} OR p.spec_line ILIKE ${ph} OR p.description ILIKE ${ph})`);
    values.push(pattern);
  }

  return { clauses, values };
}

function whereSql(build: WhereBuild): string {
  return build.clauses.length > 0 ? `WHERE ${build.clauses.join('\n  AND ')}` : '';
}

export function orderByFor(sort: SortKey): string {
  switch (sort) {
    case 'popular':
      return 'ORDER BY p.popularity DESC, p.slug ASC';
    case 'price_asc':
      return 'ORDER BY dv.price_cents ASC, p.slug ASC';
    case 'price_desc':
      return 'ORDER BY dv.price_cents DESC, p.slug ASC';
    case 'newest':
      return 'ORDER BY p.created_at DESC, p.slug ASC';
    case 'name':
      return 'ORDER BY p.title ASC, p.slug ASC';
  }
}

/** The page of product cards, with the default variant's lowest tier as the bulk teaser. */
export function buildListQuery(params: ListParams): Sql {
  const where = buildWhere(params);
  const values = [...where.values];
  const limitPh = `$${values.length + 1}`;
  const offsetPh = `$${values.length + 2}`;
  values.push(params.perPage, (params.page - 1) * params.perPage);

  const text = `SELECT
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
) lt ON true
${whereSql(where)}
${orderByFor(params.sort)}
LIMIT ${limitPh} OFFSET ${offsetPh}`;

  return { text, values };
}

export function buildCountQuery(params: ListParams): Sql {
  const where = buildWhere(params);
  return {
    text: `SELECT COUNT(*)::int AS total\n${FROM_CLAUSE}\n${whereSql(where)}`,
    values: where.values,
  };
}

export interface FacetQueries {
  materials: Sql;
  graduations: Sql;
  lengths: Sql;
  price: Sql;
}

export function buildFacetQueries(params: ListParams): FacetQueries {
  const materialWhere = buildWhere(params, 'material');
  const graduationWhere = buildWhere(params, 'graduation');
  const lengthWhere = buildWhere(params, 'length');
  const priceWhere = buildWhere(params, 'price');

  return {
    materials: {
      text: `SELECT p.material AS value, COUNT(*)::int AS count\n${FROM_CLAUSE}\n${whereSql(materialWhere)}\nGROUP BY p.material`,
      values: materialWhere.values,
    },
    graduations: {
      text: `SELECT p.graduation AS value, COUNT(*)::int AS count\n${FROM_CLAUSE}\n${whereSql(graduationWhere)}\nGROUP BY p.graduation`,
      values: graduationWhere.values,
    },
    lengths: {
      text: `SELECT vl.length AS value, COUNT(DISTINCT p.slug)::int AS count
${FROM_CLAUSE}
JOIN catalog.variants vl ON vl.product_slug = p.slug
${whereSql(lengthWhere)}
GROUP BY vl.length`,
      values: lengthWhere.values,
    },
    price: {
      text: `SELECT COALESCE(MIN(dv.price_cents), 0)::int AS "minCents", COALESCE(MAX(dv.price_cents), 0)::int AS "maxCents"\n${FROM_CLAUSE}\n${whereSql(priceWhere)}`,
      values: priceWhere.values,
    },
  };
}
