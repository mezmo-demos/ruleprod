import pg from 'pg';
import { dbConfigFromEnv } from '@ruleprod/telemetry';

/** Connection pool from the shared env contract (DATABASE_URL wins over parts). */
export function createPool(): pg.Pool {
  const config = dbConfigFromEnv();
  if (config.connectionString) {
    return new pg.Pool({ connectionString: config.connectionString });
  }
  return new pg.Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
  });
}
