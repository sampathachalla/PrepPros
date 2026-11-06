import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const apiDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
config({ path: path.join(apiDir, '.env') });

if (!process.env.DATABASE_URL) {
  console.error('[oci-api] DATABASE_URL is missing from api/.env');
  process.exit(1);
}

const databaseUrl = new URL(process.env.DATABASE_URL);
databaseUrl.hostname = process.env.OCI_DATABASE_HOST || '127.0.0.1';
databaseUrl.port = process.env.OCI_DATABASE_PORT || '5433';

const child = spawn('npm', ['run', 'dev'], {
  cwd: apiDir,
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: databaseUrl.toString() },
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.once('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
