# Build from the repo root:  docker build -f services/orders/Dockerfile .
# npm-workspaces aware, multi-stage, arm64-safe.

FROM node:22-alpine AS build
WORKDIR /app
# Manifests first so the dependency layer caches.
COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/
COPY packages/telemetry/package.json packages/telemetry/
COPY services/orders/package.json services/orders/
RUN npm ci
# Sources, then build shared packages before the service.
COPY tsconfig.base.json ./
COPY packages ./packages
COPY services/orders ./services/orders
RUN npm run build -w @ruleprod/contracts -w @ruleprod/telemetry \
  && npm run build -w @ruleprod/orders

FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    OTEL_SERVICE_NAME=orders
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/
COPY packages/telemetry/package.json packages/telemetry/
COPY services/orders/package.json services/orders/
RUN npm ci --omit=dev
COPY --from=build /app/packages/contracts/dist packages/contracts/dist
COPY --from=build /app/packages/telemetry/dist packages/telemetry/dist
COPY --from=build /app/services/orders/dist services/orders/dist
WORKDIR /app/services/orders
EXPOSE 3000
CMD ["node", "--import", "@ruleprod/telemetry/register", "dist/index.js"]
