import { readFileSync } from 'node:fs';
import pg from 'pg';
import { env } from '../../config/env.js';

let pool: pg.Pool | undefined;

/**
 * TLS settings for the Supabase connection. The server certificate is always verified; Supabase signs
 * it with its own CA, so SUPABASE_DB_CA_CERT points at that CA file (Database settings → SSL
 * Configuration → Download certificate). Local databases (tests) connect without TLS.
 */
function tlsOptions(connectionString: string): pg.PoolConfig['ssl'] {
  if (/@(localhost|127\.0\.0\.1|db)(:|\/)/.test(connectionString)) return undefined;
  return env.SUPABASE_DB_CA_CERT
    ? { ca: readFileSync(env.SUPABASE_DB_CA_CERT, 'utf8'), rejectUnauthorized: true }
    : { rejectUnauthorized: true };
}

/** Connection pool for the Supabase database, or undefined when SUPABASE_DB_URL is not set. */
export function getSupabasePool(): pg.Pool | undefined {
  if (!env.SUPABASE_DB_URL) return undefined;
  if (!pool) {
    pool = new pg.Pool({
      connectionString: env.SUPABASE_DB_URL,
      max: 3,
      connectionTimeoutMillis: 5_000,
      ssl: tlsOptions(env.SUPABASE_DB_URL),
    });
    pool.on('error', (error) => console.error('Supabase database connection error', error));
  }
  return pool;
}

export async function closeSupabasePool() {
  await pool?.end();
  pool = undefined;
}
