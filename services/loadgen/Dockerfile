# Build from the repo root:  docker build -f services/loadgen/Dockerfile .
# Pure-JS dependency tree — builds unchanged on arm64.

FROM node:22-alpine AS build
WORKDIR /app
# Workspace manifests first so npm ci layers cache well.
COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/
COPY packages/telemetry/package.json packages/telemetry/
COPY services/loadgen/package.json services/loadgen/
RUN npm ci
COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
COPY packages/telemetry packages/telemetry
COPY services/loadgen services/loadgen
RUN npm run build -w @ruleprod/contracts -w @ruleprod/telemetry \
 && npm run build -w @ruleprod/loadgen

FROM node:22-alpine AS runtime
# loadgen.synthetic=true rides on every span and log line via the env resource
# detector — it is the only thing separating robot traffic from on-camera
# human clicks. Override OTEL_RESOURCE_ATTRIBUTES with care.
ENV NODE_ENV=production \
    OTEL_SERVICE_NAME=loadgen \
    OTEL_RESOURCE_ATTRIBUTES=loadgen.synthetic=true
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/
COPY packages/telemetry/package.json packages/telemetry/
COPY services/loadgen/package.json services/loadgen/
RUN npm ci --omit=dev
COPY --from=build /app/packages/contracts/dist packages/contracts/dist
COPY --from=build /app/packages/telemetry/dist packages/telemetry/dist
COPY --from=build /app/services/loadgen/dist services/loadgen/dist
WORKDIR /app/services/loadgen
# No EXPOSE: loadgen serves nothing; it only originates traffic.
CMD ["node", "--import", "@ruleprod/telemetry/register", "dist/index.js"]
