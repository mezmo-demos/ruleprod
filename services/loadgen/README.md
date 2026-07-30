# loadgen

Synthetic customer traffic for the Rule Prod storefront, at configurable
scales. Runs as a monorepo service (not a k6 script) so every journey executes
under `@ruleprod/telemetry`: the journey's root span propagates through the
frontend and every backend hop, and one shopper journey lands as **one trace**.

## How it drives the store

Page views GET the frontend with a self-minted anonymous `sessionId` cookie —
the proxy treats it exactly like one it minted itself. Mutations go straight to
the backend APIs, because frontend writes are Next.js Server Actions keyed by a
per-build hash that rotates on every merge to main; an HTTP client that posted
them would break constantly.

Everything runs as `anon:<uuid>` shoppers. Persona accounts are never touched,
so the curated persona order histories stay clean. (Loadgen orders do
accumulate in Postgres; pruning old `anon:` orders is a known follow-up.)

## Journeys

| journey        | weight | behaviour                                              |
| -------------- | ------ | ------------------------------------------------------ |
| window_shopper | 15%    | home, maybe a listing page, gone                       |
| browser        | 40%    | category browse, 1–3 product pages                     |
| cart_builder   | 25%    | builds a cart, views it, abandons it                   |
| purchaser      | 20%    | full funnel: cart → quote → place-order → confirmation |

Purchasers sometimes use the expired `WELCOME10` or the minimum-gated
`TRADE20` promo so the `promo_*` error paths fire; some lines jump to bulk-tier
quantities.

## Scale

Arrivals are open-loop Poisson at the profile's mean rate — load clusters like
real shoppers, and a slow estate accumulates concurrency (up to the cap)
instead of the load politely backing off.

| profile  | journeys/min | max in flight | meant for              |
| -------- | ------------ | ------------- | ---------------------- |
| `quiet`  | 2            | 4             | overnight baseline     |
| `steady` | 10           | 10            | always-on demo default |
| `busy`   | 30           | 25            | promo-day traffic      |
| `rush`   | 90           | 60            | stress / OOM scenarios |

## Configuration

| env                           | default                                           | meaning                           |
| ----------------------------- | ------------------------------------------------- | --------------------------------- |
| `LOADGEN_PROFILE`             | `steady`                                          | one of the profiles above         |
| `LOADGEN_JOURNEYS_PER_MINUTE` | profile value                                     | override the arrival rate         |
| `LOADGEN_MAX_CONCURRENT`      | profile value                                     | override the in-flight cap        |
| `LOADGEN_REQUEST_TIMEOUT_MS`  | `10000`                                           | per-request timeout               |
| `FRONTEND_URL`                | `http://frontend.ruleprod-apps.svc.cluster.local` | page-view target                  |
| `CATALOG_URL` etc.            | cluster DNS                                       | backend bases (see telemetry pkg) |

A `loadgen stats` line (launched / completed / failed / shed, in-flight) is
logged every minute. Nonzero `shed` means the estate is not keeping up with
the offered load.

## Running locally

```bash
docker compose --profile loadgen up --build
# or against an already-running compose stack:
FRONTEND_URL=http://localhost:3000 CATALOG_URL=http://localhost:4101 \
CART_URL=http://localhost:4102 CHECKOUT_URL=http://localhost:4103 \
ORDERS_URL=http://localhost:4104 OTEL_SDK_DISABLED=true \
npm run dev -w @ruleprod/loadgen
```
