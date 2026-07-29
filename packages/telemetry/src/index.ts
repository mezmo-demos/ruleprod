import { pino, stdTimeFunctions, type Logger } from 'pino';

/** Structured JSON logger to stdout. Never use console.log in services. */
export function createLogger(service: string): Logger {
  return pino({
    level: process.env.LOG_LEVEL ?? 'info',
    base: { service },
    timestamp: stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
  });
}

export interface DbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  connectionString?: string;
}

/**
 * DB connection settings per the shopdb-app contract (DATABASE.md).
 * DATABASE_URL, when set, wins over the individual parts.
 */
export function dbConfigFromEnv(env: NodeJS.ProcessEnv = process.env): DbConfig {
  const config: DbConfig = {
    host: env.DB_HOST ?? 'localhost',
    port: Number(env.DB_PORT ?? 5432),
    database: env.DB_NAME ?? 'shop',
    user: env.DB_USER ?? 'shop',
    password: env.DB_PASSWORD ?? 'shop',
  };
  if (env.DATABASE_URL) {
    config.connectionString = env.DATABASE_URL;
  }
  return config;
}

/** Base URLs for service-to-service calls; cluster DNS by default. */
export function serviceUrls(env: NodeJS.ProcessEnv = process.env) {
  return {
    catalog: env.CATALOG_URL ?? 'http://catalog.ruleprod-apps.svc.cluster.local',
    cart: env.CART_URL ?? 'http://cart.ruleprod-apps.svc.cluster.local',
    checkout: env.CHECKOUT_URL ?? 'http://checkout.ruleprod-apps.svc.cluster.local',
    orders: env.ORDERS_URL ?? 'http://orders.ruleprod-apps.svc.cluster.local',
  } as const;
}
