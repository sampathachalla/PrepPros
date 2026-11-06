// Applies pending migrations. Databases created by the original db/init.sql already contain the
// baseline tables but have no migration history, which Prisma rejects (P3005); for those, the
// baseline is recorded as applied first and the remaining migrations then run normally.
import { spawnSync } from 'node:child_process';

const BASELINE = '20261101000000_baseline';

function prisma(...args) {
  const result = spawnSync('npx', ['prisma', ...args], { encoding: 'utf8' });
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  return result;
}

let result = prisma('migrate', 'deploy');
if (result.status !== 0 && `${result.stdout}${result.stderr}`.includes('P3005')) {
  console.log(`Existing database without migration history: marking ${BASELINE} as applied`);
  if (prisma('migrate', 'resolve', '--applied', BASELINE).status === 0) {
    result = prisma('migrate', 'deploy');
  }
}
process.exit(result.status ?? 1);
