// Applies pending SQL files from supabase/migrations to the Supabase database (SUPABASE_DB_URL).
// The API also does this on startup; this script is for running it on its own.
import { closeSupabasePool, getSupabasePool } from '../src/modules/supabaseSync/db.js';
import { runSupabaseMigrations } from '../src/modules/supabaseSync/migrations.js';

const pool = getSupabasePool();
if (!pool) {
  console.error('SUPABASE_DB_URL is not set');
  process.exit(1);
}
try {
  const applied = await runSupabaseMigrations(pool);
  console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Supabase database is up to date');
} finally {
  await closeSupabasePool();
}
