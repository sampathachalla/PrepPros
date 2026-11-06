import { env } from '../config/env.js';
import { AppError } from './AppError.js';

const REQUEST_TIMEOUT_MS = 15_000;

export interface SupabaseUser {
  id: string;
  email?: string;
  /** Unset until the emailed link is clicked. */
  email_confirmed_at?: string | null;
  /** `provider` is how the account signed up, e.g. email or google. */
  app_metadata?: { provider?: string };
  user_metadata?: Record<string, unknown>;
  /** Empty when signing up with an email that already has an account (Supabase hides that fact). */
  identities?: unknown[];
}

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  user: SupabaseUser;
}

/** An error answer from Supabase Auth, e.g. `invalid_credentials` or `email_not_confirmed`. */
export class SupabaseAuthError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = 'SupabaseAuthError';
  }
}

async function call<T>(path: string, init: { body?: unknown; accessToken?: string } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${env.SUPABASE_URL}/auth/v1${path}`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
        ...(init.accessToken ? { Authorization: `Bearer ${init.accessToken}` } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    console.error('Supabase Auth request failed', error);
    throw new AppError(502, 'Sign-in service is unavailable, please try again');
  }

  const text = await response.text();
  const body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!response.ok) {
    const code = (body.error_code ?? body.error) as string | undefined;
    const message = (body.msg ?? body.error_description ?? body.message ?? 'Supabase Auth error') as string;
    throw new SupabaseAuthError(response.status, code, message);
  }
  return body as T;
}

/**
 * Creates the Supabase account. With email confirmation on, no session comes back until the user
 * clicks the emailed link.
 */
export async function signUp(email: string, password: string, metadata: Record<string, unknown>) {
  const body = await call<SupabaseSession | SupabaseUser>('/signup', {
    body: { email, password, data: metadata },
  });
  return 'access_token' in body
    ? { user: body.user, session: body }
    : { user: body, session: null };
}

/** Sends the signup confirmation email again. */
export async function resendSignupConfirmation(email: string) {
  await call('/resend', { body: { type: 'signup', email } });
}

export function signInWithPassword(email: string, password: string) {
  return call<SupabaseSession>('/token?grant_type=password', { body: { email, password } });
}

/** Supabase rotates refresh tokens itself and rejects reused ones. */
export function refreshSession(refreshToken: string) {
  return call<SupabaseSession>('/token?grant_type=refresh_token', { body: { refresh_token: refreshToken } });
}

/** Ends the session behind this access token (this device only). */
export async function signOut(accessToken: string) {
  await call('/logout?scope=local', { accessToken });
}
