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
| `LOADGEN_EMAIL_DOMAIN`        | `loadgen.example`                                 | domain on synthetic order emails  |
| `LOADGEN_USER_AGENT`          | `ruleprod-loadgen/0.1`                            | UA header on frontend page views  |

A `loadgen stats` line (launched / completed / failed / shed, in-flight) is
logged every minute. Nonzero `shed` means the estate is not keeping up with
the offered load.

## Blending in (Aura scenarios)

When loadgen is background traffic for an Aura exercise, the point is that the
agent under observation should not be able to trivially separate the synthetic
load from organic traffic. Two tells are configurable:

| env                    | loud default           | quiet value              |
| ---------------------- | ---------------------- | ------------------------ |
| `LOADGEN_EMAIL_DOMAIN` | `loadgen.example`      | e.g. `fastmail.example`  |
| `LOADGEN_USER_AGENT`   | `ruleprod-loadgen/0.1` | a real browser UA string |

Deploy it out of the way, too. loadgen originates traffic and serves nothing,
so nothing needs to reach it. Run it in a **separate namespace** from
`ruleprod-apps` (e.g. `ruleprod-loadgen`) with only egress to the storefront;
it does not belong in the same namespace listing the agent is likely to read
first.

Two caveats worth stating plainly, because config alone does not hide them:

- **`loadgen.synthetic=true`** is stamped into `OTEL_RESOURCE_ATTRIBUTES` on
  every span and log line. That is deliberate honesty for the operators of the
  estate — it is not stripped by the settings above. If a scenario needs the
  telemetry itself to be indistinguishable, that is a separate, explicit
  decision to make in the Dockerfile, not an accident of these knobs.
- Traffic still **originates from the loadgen pod's IP / namespace**. An agent
  with access to the mesh or ALB access logs can group by source. Namespace
  separation raises the bar; it does not make loadgen invisible.

For anything past this — jitter on the arrival clock, rotating source
identities — say what the scenario needs and we can extend it.

## Running locally

```bash
docker compose --profile loadgen up --build
# or against an already-running compose stack:
FRONTEND_URL=http://localhost:3000 CATALOG_URL=http://localhost:4101 \
CART_URL=http://localhost:4102 CHECKOUT_URL=http://localhost:4103 \
ORDERS_URL=http://localhost:4104 OTEL_SDK_DISABLED=true \
npm run dev -w @ruleprod/loadgen
```
