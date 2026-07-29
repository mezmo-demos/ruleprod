# Build from the repo root:  docker build -f services/frontend/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/
COPY packages/telemetry/package.json packages/telemetry/
COPY services/frontend/package.json services/frontend/
RUN npm ci

COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
COPY packages/telemetry packages/telemetry
COPY services/frontend services/frontend
RUN npm run build -w @ruleprod/contracts -w @ruleprod/telemetry \
 && npm run build -w @ruleprod/frontend

FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    OTEL_SERVICE_NAME=frontend \
    PORT=3000

WORKDIR /app
# Copy the Next.js standalone build output
COPY --from=build /app/services/frontend/.next/standalone ./
# Copy the static assets
COPY --from=build /app/services/frontend/.next/static ./services/frontend/.next/static
# Note: Next.js standalone mode will also look for public directory if we had one.

EXPOSE 3000

# Next.js's native OTel (from @vercel/otel via instrumentation.ts) handles tracing
CMD ["node", "services/frontend/server.js"]
