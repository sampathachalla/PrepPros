import { Prisma, type UserRole } from '../../generated/prisma/client.js';
import { AppError } from '../../utils/AppError.js';
import * as supabase from '../../utils/supabaseAuth.js';
import * as repository from './repository.js';
import { roleSchema, usernameSchema, type LoginInput, type SignupInput } from './schema.js';

const invalidCredentials = () => new AppError(401, 'Invalid email/username or password');
const sessionExpired = () => new AppError(401, 'Your session has expired, please log in again');
const emailTaken = () => new AppError(409, 'An account with this email already exists.');

type PublicUser = NonNullable<Awaited<ReturnType<typeof repository.findUserById>>>;

export function toUserResponse(user: PublicUser) {
  return { ...user, createdAt: user.createdAt.toISOString() };
}

function toSessionResponse(user: PublicUser, session: supabase.SupabaseSession) {
  return {
    user: toUserResponse(user),
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: new Date((session.expires_at ?? Date.now() / 1000 + session.expires_in) * 1000).toISOString(),
  };
}

const accountDetails = (user: supabase.SupabaseUser): repository.AccountDetails => ({
  authProvider: user.app_metadata?.provider ?? 'email',
  emailConfirmedAt: user.email_confirmed_at ? new Date(user.email_confirmed_at) : null,
});

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

/** Turns Supabase Auth errors that users can act on into clear messages; anything else is a 502. */
function translateSupabaseError(error: unknown): never {
  if (!(error instanceof supabase.SupabaseAuthError)) throw error;
  switch (error.code) {
    case 'weak_password':
      throw new AppError(400, error.message);
    case 'email_address_invalid':
      throw new AppError(400, 'Enter a valid email address.');
    case 'validation_failed':
      // Supabase uses this one code for several inputs; its message says which
      if (/refresh token/i.test(error.message)) throw sessionExpired();
      if (/email/i.test(error.message)) throw new AppError(400, 'Enter a valid email address.');
      throw new AppError(400, error.message);
    case 'user_already_exists':
    case 'email_exists':
      throw emailTaken();
    case 'email_not_confirmed':
      throw new AppError(403, 'Please confirm your email address first; check your inbox for the link.');
    case 'invalid_credentials':
      throw invalidCredentials();
    case 'refresh_token_not_found':
    case 'refresh_token_already_used':
    case 'session_expired':
    case 'session_not_found':
      throw sessionExpired();
    case 'over_email_send_rate_limit':
      throw new AppError(429, 'Too many emails have been sent, please try again in a few minutes.');
    case 'email_address_not_authorized':
      console.error(`Supabase refused to email this address: ${error.message}`);
      throw new AppError(503, 'Confirmation emails can not be sent right now, please try again later');
  }
  if (error.status === 429) {
    throw new AppError(429, 'Too many attempts, please try again later.');
  }
  console.error(`Supabase Auth error ${error.status} ${error.code ?? ''}: ${error.message}`);
  throw new AppError(502, 'Sign-in service is unavailable, please try again');
}

/**
 * The profile of a Supabase account, created from the details saved at signup when missing
 * (e.g. the profile insert failed after Supabase created the account).
 */
async function ensureProfile(user: supabase.SupabaseUser): Promise<PublicUser> {
  const existing = await repository.findUserById(user.id);
  if (existing) return existing;

  const metadata = user.user_metadata ?? {};
  const username = usernameSchema.safeParse(metadata.username);
  const role = roleSchema.safeParse(metadata.role);
  const usernameFree = username.success && !(await repository.findUserByUsername(username.data));
  try {
    return await repository.createProfile({
      id: user.id,
      email: (user.email ?? '').toLowerCase(),
      username: usernameFree ? username.data : null,
      role: role.success ? (role.data as UserRole) : 'Member',
      ...accountDetails(user),
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      console.error(`Profile for Supabase user ${user.id} conflicts with an existing email or username`);
      throw emailTaken();
    }
    throw error;
  }
}

/**
 * Creates the Supabase account and its profile. Supabase decides whether a session comes back: with
 * "Confirm email" off it does, so the person is signed in straight away; with it on, they confirm first.
 */
export async function signup(input: SignupInput) {
  if (await repository.findUserByEmail(input.email)) throw emailTaken();

  const { user: account, session } = await supabase
    .signUp(input.email, input.password, { role: input.role })
    .catch(translateSupabaseError);
  // Supabase hides existing accounts by returning a user without identities
  if (account.identities && account.identities.length === 0) throw emailTaken();

  let user: PublicUser;
  try {
    user = await repository.createProfile({
      id: account.id,
      email: input.email,
      username: null,
      role: input.role,
      ...accountDetails(account),
    });
  } catch (error) {
    // Lost a race for the email
    if (isUniqueViolation(error)) throw emailTaken();
    throw error;
  }

  return session
    ? { ...toSessionResponse(user, session), emailConfirmationRequired: false }
    : { user: toUserResponse(user), emailConfirmationRequired: true };
}

/** The email behind an email or username (Supabase only knows emails). */
async function resolveEmail(identifier: string) {
  if (identifier.includes('@')) return identifier;
  return (await repository.findUserByUsername(identifier))?.email ?? null;
}

export async function login({ identifier, password }: LoginInput) {
  const email = await resolveEmail(identifier);
  if (!email) throw invalidCredentials();

  const session = await supabase.signInWithPassword(email, password).catch(translateSupabaseError);
  const user = await ensureProfile(session.user);
  await repository.recordLogin(user.id, accountDetails(session.user));
  return toSessionResponse(user, session);
}

/**
 * Sends the confirmation email again, for anyone who lost it: signing up again can't help, because
 * the email is already taken. Only rate limits are reported, so this can't reveal who has an account.
 */
export async function resendConfirmation(identifier: string) {
  const email = await resolveEmail(identifier);
  if (!email) return;
  await supabase.resendSignupConfirmation(email).catch((error) => {
    if (error instanceof supabase.SupabaseAuthError && error.status !== 429 && error.status < 500) return;
    translateSupabaseError(error);
  });
}

/** Exchanges a refresh token for a new session; Supabase rotates it and rejects reused tokens. */
export async function refresh(refreshToken: string) {
  const session = await supabase.refreshSession(refreshToken).catch(translateSupabaseError);
  return toSessionResponse(await ensureProfile(session.user), session);
}

/** Ends this device's session; an already-ended session is not an error. */
export async function logout(accessToken: string) {
  await supabase.signOut(accessToken).catch((error) => {
    if (error instanceof supabase.SupabaseAuthError && error.status < 500) return;
    translateSupabaseError(error);
  });
}
