import { env } from '../../config/env.js';

const REQUEST_TIMEOUT_MS = 30_000;

export const isStorageConfigured = () => Boolean(env.SUPABASE_SECRET_KEY);

/**
 * Secret keys (sb_secret_...) are not JWTs and belong in `apikey` only; a legacy service_role key is a
 * JWT, which Storage also expects as the bearer token.
 */
function authHeaders(): Record<string, string> {
  const key = env.SUPABASE_SECRET_KEY ?? '';
  return { apikey: key, ...(key.startsWith('sb_') ? {} : { Authorization: `Bearer ${key}` }) };
}

const storageFetch = (path: string, init: RequestInit) =>
  fetch(`${env.SUPABASE_URL}/storage/v1${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init.headers },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

/** Creates the private backup bucket unless it already exists. */
export async function ensureBucket() {
  const bucket = env.SUPABASE_BACKUP_BUCKET;
  const response = await storageFetch('/bucket', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: bucket, name: bucket, public: false }),
  });
  if (response.ok) return;
  const body = await response.text();
  // Storage reports an existing bucket as a 400 whose body carries the real status
  if (response.status === 409 || /already exists|duplicate/i.test(body)) return;
  throw new Error(`Could not create Storage bucket ${bucket}: HTTP ${response.status} ${body}`);
}

/** Uploads a new object; existing objects are never overwritten. */
export async function uploadJsonl(path: string, content: string) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const response = await storageFetch(`/object/${env.SUPABASE_BACKUP_BUCKET}/${encodedPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-ndjson' },
    body: content,
  });
  if (!response.ok) {
    throw new Error(`Storage upload of ${path} failed: HTTP ${response.status} ${await response.text()}`);
  }
}
