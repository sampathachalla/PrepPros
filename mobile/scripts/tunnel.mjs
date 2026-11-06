import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const mobileDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = path.resolve(mobileDir, '..', 'api');
const apiPort = Number(process.env.API_PORT || 8000);
const expoMode = process.env.EXPO_TUNNEL_MODE === 'dev-client' ? 'dev-client' : 'go';
const persistent = process.env.PREPPROS_PERSISTENT === '1';
const backendTarget = process.env.EXPO_PUBLIC_BACKEND_TARGET || (persistent ? 'oci' : 'tunnel');
const watchdogIntervalMs = Number(process.env.TUNNEL_WATCHDOG_INTERVAL_MS || 15_000);
const children = new Set();
let stopping = false;
let expoPublicUrl;
let watchdogTimer;

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

function startWithOutput(command, args, options = {}, onOutput = () => {}) {
  const child = spawn(command, args, {
    stdio: ['inherit', 'pipe', 'pipe'],
    ...options,
  });
  children.add(child);
  child.once('exit', () => children.delete(child));
  for (const [stream, destination] of [
    [child.stdout, process.stdout],
    [child.stderr, process.stderr],
  ]) {
    stream.on('data', (chunk) => {
      destination.write(chunk);
      onOutput(chunk.toString());
    });
  }
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

async function publicEndpointHealthy(url, path = '/health') {
  if (!url) return false;
  return isHealthy(`${url.replace(/\/+$/, '')}${path}`);
}

function startWatchdog(publicApiUrl, ngrok, expo) {
  let apiFailures = 0;
  let expoFailures = 0;
  let checking = false;

  watchdogTimer = setInterval(async () => {
    if (checking || stopping) return;
    checking = true;
    try {
      apiFailures = (await publicEndpointHealthy(publicApiUrl)) ? 0 : apiFailures + 1;
      if (expoPublicUrl) {
        expoFailures = (await publicEndpointHealthy(expoPublicUrl, '/status')) ? 0 : expoFailures + 1;
      }

      if (apiFailures >= 2) {
        console.error('[tunnel] Public API relay is stale; restarting the tunnel process.');
        ngrok.kill('SIGTERM');
      } else if (expoFailures >= 2) {
        console.error('[tunnel] Public Expo relay is stale; restarting the tunnel process.');
        expo.kill('SIGTERM');
      }
    } finally {
      checking = false;
    }
  }, watchdogIntervalMs);
  watchdogTimer.unref();
}

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  if (watchdogTimer) clearInterval(watchdogTimer);
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
  console.log(`[tunnel] App backend target: ${backendTarget}`);
  console.log(`[tunnel] Starting Expo in ${expoMode === 'dev-client' ? 'development build' : 'Expo Go'} mode...`);

  const expoArgs = ['expo', 'start', '--tunnel'];
  if (expoMode === 'dev-client') expoArgs.push('--dev-client');
  let expoOutput = '';
  const expo = startWithOutput('npx', expoArgs, {
    cwd: mobileDir,
    env: {
      ...process.env,
      EXPO_PUBLIC_BACKEND_TARGET: backendTarget,
      EXPO_PUBLIC_LOCAL_API_URL: process.env.EXPO_PUBLIC_LOCAL_API_URL || `http://127.0.0.1:${apiPort}`,
      EXPO_PUBLIC_TUNNEL_API_URL: publicApiUrl,
      EXPO_PUBLIC_OCI_API_URL: process.env.EXPO_PUBLIC_OCI_API_URL || publicApiUrl,
      EXPO_PUBLIC_API_URL: publicApiUrl,
    },
  }, (output) => {
    expoOutput = `${expoOutput}${output}`.slice(-4_096);
    const match = expoOutput.match(/https?:\/\/([a-zA-Z0-9.-]+\.(?:on\.expo\.app|exp\.direct))/);
    if (match && expoPublicUrl !== `https://${match[1]}`) {
      expoPublicUrl = `https://${match[1]}`;
      console.log(`[tunnel] Expo public relay: ${expoPublicUrl}`);
    }
  });
  expo.once('exit', (code) => stop(code || 0));
  startWatchdog(publicApiUrl, ngrok, expo);
} catch (error) {
  console.error(`[tunnel] ${error instanceof Error ? error.message : String(error)}`);
  stop(1);
}
