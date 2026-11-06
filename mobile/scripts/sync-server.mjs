// Keeps the server's copy of mobile/ matching this Mac, so Metro there picks up every save.
// Usage: npm run sync (add -- --dry-run to only list what would change). Needs SYNC_TARGET in .env.
import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const mobileDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = process.env.SYNC_TARGET;
if (!target) {
  console.error('[sync] Set SYNC_TARGET in mobile/.env, for example user@host:/path/to/mobile/');
  process.exit(1);
}
const dryRun = process.argv.includes('--dry-run');
const DEBOUNCE_MS = 300;

// Machine-specific files. These are never copied, and --delete leaves them alone on the server.
const EXCLUDED = ['node_modules', '.expo', '.git', 'dist', 'ios', 'android', 'coverage', '.DS_Store'];
const isExcluded = (file) =>
  file.split(path.sep).some((part) => EXCLUDED.includes(part) || part.startsWith('.env'));

let running = false;
let queued = false;
let timer;

function sync() {
  if (running) {
    queued = true;
    return;
  }
  running = true;

  const args = ['-ac', '--delete', ...[...EXCLUDED, '.env*'].map((name) => `--exclude=${name}`)];
  if (dryRun) args.push('-n', '--itemize-changes');

  const rsync = spawn(
    'rsync',
    [...args, '-e', 'ssh -o BatchMode=yes -o ConnectTimeout=15', `${mobileDir}/`, target],
    { stdio: 'inherit' },
  );

  const finish = (failure) => {
    running = false;
    const time = new Date().toLocaleTimeString();
    if (failure) console.error(`[sync] ${time} failed (${failure}); will retry on the next save`);
    else console.log(`[sync] ${time} ${dryRun ? 'dry run finished' : 'server is up to date'}`);
    if (queued) {
      queued = false;
      sync();
    }
  };

  rsync.once('error', (error) => finish(error.message));
  rsync.once('exit', (code) => finish(code ? `rsync exit ${code}` : null));
}

watch(mobileDir, { recursive: true }, (_event, file) => {
  if (!file || isExcluded(file)) return;
  clearTimeout(timer);
  timer = setTimeout(sync, DEBOUNCE_MS);
});

console.log(`[sync] Watching ${mobileDir}`);
console.log(`[sync] Target: ${target}${dryRun ? ' (dry run)' : ''}`);
sync();
