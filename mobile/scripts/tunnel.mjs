import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const mobileDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = path.resolve(mobileDir, '..', 'api');
const apiPort = Number(process.env.API_PORT || 8000);
const expoMode = process.env.EXPO_TUNNEL_MODE === 'dev-client' ? 'dev-client' : 'go';
const children = new Set();
let stopping = false;

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function start(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    ...options,
  });
  children.add(child);
  child.once('exit', () => children.delete(child));
  return child;
}

async function isHealthy(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitFor(description, check, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await check();
    if (result) return result;
    await delay(500);
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

async function getNgrokUrl() {
  try {
    const response = await fetch('http://127.0.0.1:4040/api/tunnels', {
      signal: AbortSignal.timeout(2_000),
    });
    if (!response.ok) return undefined;
    const { tunnels = [] } = await response.json();
    return tunnels.find(
      (tunnel) => tunnel.proto === 'https' && String(tunnel.config?.addr).endsWith(`:${apiPort}`),
    )?.public_url;
  } catch {
    return undefined;
  }
}

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGINT');
  setTimeout(() => {
    for (const child of children) child.kill('SIGTERM');
    process.exit(exitCode);
  }, 1_500).unref();
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

try {
  const healthUrl = `http://127.0.0.1:${apiPort}/health`;
  if (!(await isHealthy(healthUrl))) {
    console.log(`[tunnel] Starting the local API on port ${apiPort}...`);
    const api = start('npm', ['run', 'dev'], {
      cwd: apiDir,
      env: { ...process.env, PORT: String(apiPort) },
    });
    api.once('exit', (code) => {
      if (!stopping) {
        console.error(`[tunnel] API stopped unexpectedly (exit ${code ?? 'unknown'}).`);
        stop(code || 1);
      }
    });
    await waitFor('the local API', () => isHealthy(healthUrl));
  } else {
    console.log(`[tunnel] Reusing the healthy API already running at ${healthUrl}.`);
  }

  console.log(`[tunnel] Opening a public HTTPS tunnel to port ${apiPort}...`);
  const ngrok = start('ngrok', ['http', String(apiPort)], { cwd: mobileDir });
  ngrok.once('exit', (code) => {
    if (!stopping) {
      console.error(`[tunnel] ngrok stopped unexpectedly (exit ${code ?? 'unknown'}).`);
      stop(code || 1);
    }
  });

  const publicApiUrl = await waitFor('the ngrok HTTPS URL', getNgrokUrl);
  console.log(`[tunnel] Public API: ${publicApiUrl}`);
  console.log(`[tunnel] Starting Expo in ${expoMode === 'dev-client' ? 'development build' : 'Expo Go'} mode...`);

  const expoArgs = ['expo', 'start', '--tunnel'];
  if (expoMode === 'dev-client') expoArgs.push('--dev-client');
  const expo = start('npx', expoArgs, {
    cwd: mobileDir,
    env: { ...process.env, EXPO_PUBLIC_API_URL: publicApiUrl },
  });
  expo.once('exit', (code) => stop(code || 0));
} catch (error) {
  console.error(`[tunnel] ${error instanceof Error ? error.message : String(error)}`);
  stop(1);
}
