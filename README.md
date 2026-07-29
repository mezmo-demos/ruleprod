# Rule Prod — ruleprod.com

The storefront of Rule Prod, a fictional company that sells every kind of ruler.
It exists as a demo application for Mezmo observability: five TypeScript services
on Kubernetes, deployed by Argo CD from the sibling
[`gitops`](https://github.com/mezmo-demos/gitops) repo.

**No payment is ever taken.** Checkout completes against an invoice / net-30 stub.
Card-shaped data is never accepted, transmitted, or stored.

## Layout

```
services/
  frontend/    Next.js storefront — the only internet-facing service
  catalog/     Products, variants, bulk-price tiers, sales, facets  (Postgres)
  cart/        Per-user carts, saved carts                          (Postgres)
  checkout/    Stateless orchestrator: re-price, promo, tax, order
  orders/      Order history + background status progression        (Postgres)
packages/
  contracts/   Shared TypeScript types, personas, image keys
  telemetry/   OTel bootstrap (--import) + pino logger + env helpers
.github/workflows/
```

Service-to-service API shapes live in [docs/CONTRACTS.md](docs/CONTRACTS.md).
Architecture and platform decisions live in the gitops repo:
`docs/WEBSITE.md`, `docs/DATABASE.md`, `docs/PLAN.md`.

## Data tier

One shared CloudNativePG cluster `shopdb` (database `shop`), reached via
`shopdb-rw.ruleprod-apps.svc.cluster.local:5432` with credentials from the
`shopdb-app` secret. Each service owns its own Postgres **schema**
(`catalog`, `cart`, `orders`) and runs idempotent migrations on boot.
`checkout` and `frontend` are stateless.

## Local development

```bash
nvm use
npm install
npm run build
docker compose up        # postgres + the four backends + frontend
```

Frontend: http://localhost:3000 · catalog :4101 · cart :4102 · checkout :4103 · orders :4104

## Release loop

1. CI builds the changed service(s) on arm64, tags the image with the git SHA — never `latest`.
2. Pushes to ECR (`ruleprod/<service>`) via an OIDC push role. No stored AWS keys.
3. Opens an image-tag bump PR against the gitops repo
   (`workloads/services/<service>/deployment.yaml`). Merge = release, revert = rollback.

## Telemetry

Every service exports OTLP traces/metrics to
`otel-collector.otel.svc.cluster.local:4318` (override with
`OTEL_EXPORTER_OTLP_ENDPOINT`, disable with `OTEL_SDK_DISABLED=true`).
Logs are structured pino JSON on stdout.
