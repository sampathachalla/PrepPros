import { readdir, readFile } from 'node:fs/promises';
import type pg from 'pg';

/** api/supabase/migrations, from both src/ and dist/. */
const MIGRATIONS_DIR = new URL('../../../supabase/migrations/', import.meta.url);
const LOCK_ID = 727_001; // any constant; stops two API instances migrating at once

/** Applies SQL files from supabase/migrations that have not run yet, in name order. */
export async function runSupabaseMigrations(pool: pg.Pool): Promise<string[]> {
  const files = (await readdir(MIGRATIONS_DIR)).filter((name) => name.endsWith('.sql')).sort();
  const client = await pool.connect();
  const applied: string[] = [];
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
    await client.query('CREATE SCHEMA IF NOT EXISTS preppros');
    await client.query(`CREATE TABLE IF NOT EXISTS preppros.schema_migrations (
      name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    const { rows } = await client.query<{ name: string }>('SELECT name FROM preppros.schema_migrations');
    const done = new Set(rows.map((row) => row.name));

    for (const name of files.filter((file) => !done.has(file))) {
      const sql = await readFile(new URL(name, MIGRATIONS_DIR), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO preppros.schema_migrations (name) VALUES ($1)', [name]);
        await client.query('COMMIT');
        applied.push(name);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Supabase migration ${name} failed: ${(error as Error).message}`);
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => undefined);
    client.release();
  }
  return applied;
}
