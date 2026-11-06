import { execSync } from 'node:child_process';

/** Brings the test database and the Supabase stand-in up to their latest migrations. */
export default function setup() {
  execSync('node prisma/deploy.mjs', {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
    stdio: 'inherit',
  });
  execSync('npx tsx --env-file-if-exists=.env scripts/supabase-migrate.ts', {
    env: { ...process.env, SUPABASE_DB_URL: process.env.TEST_SUPABASE_DB_URL },
    stdio: 'inherit',
  });
}
