# Build from the repo root:  docker build -f services/cart/Dockerfile .
# Pure-JS dependency tree — builds unchanged on arm64.

FROM node:22-alpine AS build
WORKDIR /app
# Workspace manifests first so npm ci layers cache well.
COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/
COPY packages/telemetry/package.json packages/telemetry/
COPY services/cart/package.json services/cart/
RUN npm ci
COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
COPY packages/telemetry packages/telemetry
COPY services/cart services/cart
RUN npm run build -w @ruleprod/contracts -w @ruleprod/telemetry \
 && npm run build -w @ruleprod/cart

FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    OTEL_SERVICE_NAME=cart
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/
COPY packages/telemetry/package.json packages/telemetry/
COPY services/cart/package.json services/cart/
RUN npm ci --omit=dev
COPY --from=build /app/packages/contracts/dist packages/contracts/dist
COPY --from=build /app/packages/telemetry/dist packages/telemetry/dist
COPY --from=build /app/services/cart/dist services/cart/dist
WORKDIR /app/services/cart
EXPOSE 3000
CMD ["node", "--import", "@ruleprod/telemetry/register", "dist/index.js"]
