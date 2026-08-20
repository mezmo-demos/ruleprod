# Build from repo root: docker build -f services/aura-bridge/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/telemetry/package.json packages/telemetry/
COPY services/aura-bridge/package.json services/aura-bridge/
RUN npm ci
COPY tsconfig.base.json ./
COPY packages/telemetry packages/telemetry
COPY services/aura-bridge services/aura-bridge
RUN npm run build -w @ruleprod/telemetry && npm run build -w @ruleprod/aura-bridge

FROM node:22-alpine
ENV NODE_ENV=production \
    OTEL_SERVICE_NAME=aura-bridge
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/telemetry/package.json packages/telemetry/
COPY services/aura-bridge/package.json services/aura-bridge/
RUN npm ci --omit=dev
COPY --from=build /app/packages/telemetry/dist packages/telemetry/dist
COPY --from=build /app/services/aura-bridge/dist services/aura-bridge/dist
WORKDIR /app/services/aura-bridge
EXPOSE 3000
CMD ["node", "--import", "@ruleprod/telemetry/register", "dist/index.js"]
