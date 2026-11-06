import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  /** Hermes Agent's OpenAI-compatible API server. */
  AGENT_URL: z
    .url()
    .default('http://hermes-agent:8642')
    .transform((url) => url.replace(/\/+$/, '')),
  /** Bearer key for Hermes Agent's API server (its API_SERVER_KEY); chat is unavailable without it. */
  HERMES_API_KEY: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined),
  /** Shared secret the Hermes container's PrepPros tools send when calling `/chat/tools`. */
  AGENT_TOOLS_KEY: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined)
    .pipe(z.string().min(32, 'AGENT_TOOLS_KEY must be at least 32 characters').optional()),
  /** Supabase project URL, e.g. https://<project>.supabase.co (handles sign-up, login and sessions). */
  SUPABASE_URL: z.url().transform((url) => url.replace(/\/+$/, '')),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1, 'SUPABASE_PUBLISHABLE_KEY is required'),
  /**
   * Postgres connection string of the Supabase database (Session pooler). Links users share and
   * Instagram content are copied there; without it, everything stays in the local database only.
   */
  SUPABASE_DB_URL: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined),
  /** Path to Supabase's CA certificate (.crt), used to verify the database's TLS certificate. */
  SUPABASE_DB_CA_CERT: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined),
  /**
   * Inline JSON Web Key Set used instead of fetching the project's public keys. Only for tests,
   * which sign their own tokens.
   */
  SUPABASE_JWKS: z.string().optional(),
  /**
   * Server-only Supabase secret key (or legacy service_role key). Enables the JSONL backup in Supabase
   * Storage; without it, backups wait and are written once the key is set. Never ship it in the app.
   */
  SUPABASE_SECRET_KEY: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined),
  /** Private Supabase Storage bucket for the JSONL backup; created on startup if missing. */
  SUPABASE_BACKUP_BUCKET: z
    .string()
    .optional()
    .transform((value) => value?.trim() || 'preppros-backups'),
  /**
   * TEMPORARY: bookmark requests with no access token act as this user. Requests with a token always
   * use the token's user. Remove it before the API is exposed to real users.
   */
  TEMP_USER_ID: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined)
    .pipe(z.uuid('TEMP_USER_ID must be a UUID').optional()),
  /** Enables Instagram link previews through Bright Data's Instagram scraper. */
  BRIGHT_DATA_API_KEY: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined),
  /** YouTube Data API v3 key for video details; without it, only title/channel/thumbnail are read (oEmbed). */
  YOUTUBE_API_KEY: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export const env = loadEnv();
