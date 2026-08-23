# Service contracts (v1)

Every shape here is mirrored as TypeScript types in `@ruleprod/contracts`.
If this doc and the package disagree, fix whichever is wrong — they ship together.

## Topology

| Service  | Port (in-container) | State                     | Cluster DNS                                |
| -------- | ------------------- | ------------------------- | ------------------------------------------ |
| frontend | 3000                | none (signed cookies)     | `frontend.ruleprod-apps.svc.cluster.local` |
| catalog  | 3000                | Postgres schema `catalog` | `catalog.ruleprod-apps.svc.cluster.local`  |
| cart     | 3000                | Postgres schema `cart`    | `cart.ruleprod-apps.svc.cluster.local`     |
| checkout | 3000                | stateless                 | `checkout.ruleprod-apps.svc.cluster.local` |
| orders   | 3000                | Postgres schema `orders`  | `orders.ruleprod-apps.svc.cluster.local`   |

Local docker-compose host ports: frontend 3000, catalog 4101, cart 4102, checkout 4103, orders 4104.

Call graph: frontend → {catalog, cart, checkout, orders}; cart → catalog;
checkout → {cart, catalog, orders}. Nothing else calls anything else.

## Common conventions

- **Env**: `PORT` (default 3000). DB services: `DB_HOST` (default `localhost`),
  `DB_PORT` (5432), `DB_NAME` (`shop`), `DB_USER` (`shop`), `DB_PASSWORD` (`shop`),
  or a full `DATABASE_URL` which wins over the parts. Service URLs:
  `CATALOG_URL`, `CART_URL`, `CHECKOUT_URL`, `ORDERS_URL` — defaults are the
  cluster DNS names above with `http://` and port 80.
- **Money**: integer cents, USD, suffix `Cents` on every field. Round half-up.
- **IDs**: `crypto.randomUUID()`. Timestamps: ISO-8601 UTC strings.
- **Errors**: non-2xx bodies are `{ "error": { "code": string, "message": string } }`.
  Codes used across services: `not_found`, `invalid_request`, `conflict`,
  `promo_invalid`, `promo_expired`, `promo_minimum_not_met`, `inventory_drift`,
  `upstream_timeout`, `upstream_error`.
- **Health**: `GET /healthz` → 200 always (liveness). `GET /readyz` → 200 when the
  DB (if any) answers `SELECT 1`, else 503.
- **Telemetry**: run under `node --import @ruleprod/telemetry/register dist/index.js`
  with `OTEL_SERVICE_NAME=<service>`. Logs via `createLogger(service)` from
  `@ruleprod/telemetry` — pino JSON to stdout, never console.log.
- **Migrations**: each DB service applies idempotent SQL on boot
  (`CREATE SCHEMA IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` + seed upserts)
  under `pg_advisory_lock` so multiple replicas don't race. A service touches
  **only its own schema**.
- **User keys**: a cart/order belongs to a `userKey` string —
  `anon:<uuid>` for guests (frontend session cookie) or `persona:<id>` for a
  signed-in persona. Personas are the fixed list in `@ruleprod/contracts`
  (`ava`, `marcus`, `priya`, `june`, `walter`). No signup, no passwords, no real PII.

## Pricing ownership (do not blur this)

- **catalog** owns unit prices, sales, and bulk-tier arithmetic. Everyone who
  needs a price calls `POST /api/price-quote`. `cart` stores skus and
  quantities and _joins_ quotes onto them; it never computes a price.
- **checkout** owns order-level promo, shipping, and tax. Nothing else touches them.

## catalog

Facet vocabulary (also constants in contracts): categories
`trades | studio | school | textile | vintage`; materials
`Stainless steel | Spring steel | Boxwood | Aluminium | Fibreglass | Plastic | Bamboo | Brass`;
lengths `6 in | 12 in | 18 in | 24 in | 36 in | 48 in | Tape`;
graduations `Metric | Imperial | Dual | 4R | 8ths & 16ths | Engineer`.

- `GET /api/categories` → `{ categories: [{ slug, name, subtitle, image }] }`
- `GET /api/products` — query params: `category`, repeatable `material`, `length`,
  `graduation`, `price_min` / `price_max` (cents), `in_stock=1`, `bulk_only=1`,
  `q` (search), `sort` = `popular | price_asc | price_desc | newest | name`
  (default `popular`), `page` (1-based), `per_page` (default 12).
  → `{ products: ProductCard[], total, page, perPage, facets }` where facets carry
  per-value counts for the current filter set and `price: { minCents, maxCents }`.
  `ProductCard`: `{ slug, title, specLine, image, priceCents, badge?: 'best_seller' | 'low_stock',
stock, bulk: { minQty, unitPriceCents } | null }` (lowest tier teaser, null → "no bulk").
- `GET /api/products/:slug` → full `Product`: card fields plus `category`,
  `description`, `images: string[]` (image keys, ≥1; slot 0 is primary),
  `specs: { material, finish, thickness, graduation, tolerance, madeIn }`,
  `rating: { average, count }`, `reviews: [{ headline, body, author, verified }]`,
  `variants: [{ sku, label, priceCents, stock, tiers: [{ minQty, unitPriceCents }] }]`,
  `defaultSku`.
- `GET /api/products/:slug/related` → `{ products: ProductCard[] }` (4, same category).
- `GET /api/skus/:sku` → `{ sku, slug, title, variantLabel, specLine, image, priceCents, stock }`
- `POST /api/price-quote` body `{ lines: [{ sku, qty }] }` →
  `{ lines: QuotedLine[], subtotalCents, bulkSavingsCents, unitCount }`.
  `QuotedLine`: `{ sku, qty, stock, product: { slug, title, variantLabel, specLine, image },
baseUnitPriceCents, unitPriceCents, lineTotalCents,
appliedTier: { minQty, unitPriceCents } | null,
nextTier: { minQty, unitPriceCents, unitsAway } | null }`.
  Sale windows (percent off, start/end) apply to the base price before tiers.
  Unknown sku → 422 `invalid_request` naming the sku.

Seed: ~30 products across the five categories, each with 1–4 length variants,
realistic specs/reviews, image keys from the canonical list below. Include the
design's hero product exactly: slug `precision-steel-rule-6`, 6-in machinist
rule, SKU `RP-SR-6R4`, $34.00, variants 6/12/18/24 in (12 in `RP-SR-12R4` $42.00,
24 in sold out), tiers 10+ → $30.60, 25+ → $27.20, 100+ → $23.80, stock 412,
rating 4.8 / 214, badge `best_seller`. One vintage item with stock 3 and badge
`low_stock` ("1 of 3 left" is rendered from stock). v1 never mutates stock.

Products may be `hidden`: unlisted items that never appear in listings, search
results, facet counts or related products, but still resolve by slug and sku —
so cart, quote and checkout treat them like any other product. There is no
query param to reveal them; the frontend's unlinked `/rural-prod` page is the
only way in.

## cart

Cart keyed by `userKey` (`:key` below). Every mutation returns the full priced
cart (cart calls catalog `price-quote` to assemble it):

`Cart` = `{ key, lines: CartLine[], savedForLater: CartLine[], unitCount,
subtotalCents, bulkSavingsCents }` — `CartLine` = `QuotedLine` plus
`{ id, addedAt }`. Counts/subtotals cover active lines only.

- `GET /api/carts/:key` → `Cart` (empty cart, not 404)
- `POST /api/carts/:key/lines` `{ sku, qty }` — merges onto an existing line of the same sku
- `PATCH /api/carts/:key/lines/:lineId` `{ qty }` (qty ≥ 1)
- `DELETE /api/carts/:key/lines/:lineId`
- `POST /api/carts/:key/lines/:lineId/save-for-later` · `POST .../move-to-cart`
- `POST /api/carts/:key/clear` — active lines only; checkout calls this after placing
- `GET /api/carts/:key/saved-carts` → `{ savedCarts: [{ id, name, itemCount, totalCents, savedAt }] }`
- `POST /api/carts/:key/saved-carts` `{ name }` — snapshots active lines, keeps them
- `POST /api/carts/:key/saved-carts/:id/restore` `{ mode: 'merge' | 'replace' }` → `Cart`
- `DELETE /api/carts/:key/saved-carts/:id`
- `POST /api/carts/:key/rekey` `{ toKey }` — moves lines, saved-for-later and saved
  carts onto `toKey` (merging same-sku lines), deletes `:key`. Guest → persona.
- `GET /api/back-paddock/buzz` → `{ grabs, sessions }` — in-process social-proof
  counts for the unlisted /rural-prod drop; incremented when a drop sku is added.

## checkout (stateless)

Config lives in code: promo table, shipping, tax. Promos:
`SUMMER15` 15% off through 2026-08-31 · `WELCOME10` 10% off, **expired** 2026-05-31 ·
`TRADE20` 20% off, minimum subtotal $500.00. Shipping: `standard` (4 business
days) $6.50, free when post-bulk subtotal ≥ $75.00; `expedited` (2 days) $18.00.
Tax: 8.875% of (subtotal − promo discount), rounded half-up.

- `POST /api/checkout/promo` `{ code, subtotalCents }` →
  `{ valid: true, code, percentOff, discountCents }` or 422 with
  `promo_invalid | promo_expired | promo_minimum_not_met` (message is user-facing).
- `POST /api/checkout/quote` `{ cartKey, delivery: 'standard' | 'expedited', promoCode? }` →
  `{ lines, unitCount, subtotalCents, bulkSavingsCents, promo: { code, discountCents } | null,
shippingCents, taxCents, totalCents }` — re-priced via cart → catalog, never trusted
  from the client. Invalid promo → still 200, with `promo: null` and
  `promoError: { code, message }`.
- `POST /api/checkout/place-order` body:
  `{ idempotencyKey, cartKey, userKey?, contact: { email, name? },
shippingAddress: { name, street1, street2?, city, state, zip, country: 'US' },
delivery, payment: { method: 'invoice_net30' | 'purchase_order' }, promoCode? }`
  → 201 `{ orderId, orderNumber, placedAt, arrivesEstimate, totals }`.
  Flow: quote → verify qty ≤ stock per line (else 409 `inventory_drift` naming the
  sku) → `POST orders /api/orders` (5s timeout → 504 `upstream_timeout`) →
  `POST cart /clear` (best-effort) → respond. `userKey` defaults to `cartKey`.
  Empty cart → 409 `conflict`. Payment methods are labels only — **no card data
  fields exist anywhere in this API, by design. Never add them.**

## orders

- `POST /api/orders` — from checkout:
  `{ idempotencyKey, userKey, contact, shippingAddress, delivery: { method, priceCents },
payment: { method }, promo: { code, discountCents } | null,
lines: [{ sku, slug, title, variantLabel, image, qty, unitPriceCents, lineTotalCents }],
totals: { subtotalCents, bulkSavingsCents, promoDiscountCents, shippingCents, taxCents, totalCents } }`
  → 201 `Order`. Same `idempotencyKey` again → 200 with the existing order.
- `GET /api/orders?userKey=` →
  `{ orders: OrderSummary[], stats: { orderCount, lifetimeCents } }`, newest first.
  `OrderSummary`: `{ id, orderNumber, status, placedAt, arrivesEstimate, totalCents,
unitCount, summaryLine, thumbs: string[] }` (≤3 image keys;
  `summaryLine` e.g. "15 units · placed 12 Jul").
- `GET /api/orders/:idOrNumber` → full `Order` (summary + lines, contact, address,
  delivery, payment, promo, totals). Accepts uuid or `RP-#####`.
- `POST /api/orders/rekey` `{ fromUserKey, toUserKey }` → `{ moved }` — guest → persona backfill.

Order numbers: `RP-` + sequence starting 10517. Status:
`placed → processing → in_transit → delivered`, advanced by a background loop
(every `ORDERS_STATUS_INTERVAL_MS`, default 30s) on age since `placedAt`:
2 min → processing, 6 min → in_transit, 18 min → delivered (each threshold
env-overridable). Conditional UPDATEs keyed on current status, so replicas
never double-advance. `arrivesEstimate` = placedAt + 4 business days
(standard) / 2 (expedited).

## Image keys

Images are opaque keys, not URLs. Frontend resolves `<key>` → `/img/<key>.jpg`
(baked static assets) and falls back to a striped placeholder tile with a
monospace label. Canonical keys — catalog must use only these:

`hero-fanned`, `cat-trades`, `cat-studio`, `cat-school`, `cat-vintage`,
`prod-steel-rule`, `prod-steel-rule-alt`, `prod-folding-rule`,
`prod-framing-square`, `prod-tape-measure`, `prod-tailor-tape`,
`prod-school-ruler`, `prod-drafting-triangle`, `prod-architect-scale`,
`prod-slide-rule`, `prod-wooden-ruler`, `editorial-workbench`,
`prod-cattle-prod`, `sticker-rural-prod`, `sticker-support-local`.
