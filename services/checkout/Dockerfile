# syntax=docker/dockerfile:1
# Build context = repo root:  docker build -f services/checkout/Dockerfile .

# ---- manifests: only the npm workspace manifests, for a cacheable npm ci ----
FROM node:22-alpine AS manifests
WORKDIR /repo
COPY . .
RUN mkdir -p /manifests \
 && cp package.json package-lock.json /manifests/ \
 && find packages services -maxdepth 2 -name package.json | while read -r f; do \
      mkdir -p "/manifests/$(dirname "$f")" && cp "$f" "/manifests/$f"; \
    done

# ---- build: full install (dev deps) + compile shared packages, then the service ----
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=manifests /manifests ./
RUN npm ci
COPY tsconfig.base.json ./
COPY packages ./packages
COPY services/checkout ./services/checkout
RUN npm run build -w @ruleprod/contracts -w @ruleprod/telemetry \
 && npm run build -w @ruleprod/checkout

# ---- runtime: production deps for the checkout workspace only ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    OTEL_SERVICE_NAME=checkout
WORKDIR /app
COPY --from=manifests /manifests ./
RUN npm ci --omit=dev -w services/checkout \
 && npm cache clean --force
COPY --from=build /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /app/packages/telemetry/dist ./packages/telemetry/dist
COPY --from=build /app/services/checkout/dist ./services/checkout/dist
USER node
WORKDIR /app/services/checkout
EXPOSE 3000
CMD ["node", "--import", "@ruleprod/telemetry/register", "dist/index.js"]
