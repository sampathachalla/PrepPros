import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, createUser, prisma, resetDatabase, signAccessToken } from './helpers.js';

const CONFIRMED_AT = '2026-11-04T10:00:00.000Z';

/**
 * A small stand-in for Supabase Auth: accounts with passwords, email confirmation, and one-time
 * refresh tokens, answering with the same shapes and error codes as the real service.
 */
class FakeSupabase {
  confirmEmails = true;
  resendError: [number, string, string] | null = null;
  accounts = new Map<string, { id: string; email: string; password: string; confirmed: boolean; metadata: object }>();
  refreshTokens = new Map<string, { userId: string; used: boolean }>();
  calls: { path: string; body: any; headers: Record<string, string> }[] = [];

  private error(status: number, code: string, msg: string) {
    return new Response(JSON.stringify({ code: status, error_code: code, msg }), { status });
  }

  private async session(account: { id: string; email: string; metadata: object }) {
    const refreshToken = randomUUID();
    this.refreshTokens.set(refreshToken, { userId: account.id, used: false });
    const user = {
      id: account.id,
      email: account.email,
      email_confirmed_at: CONFIRMED_AT,
      app_metadata: { provider: 'email' },
      user_metadata: account.metadata,
      identities: [{}],
    };
    return {
      access_token: await signAccessToken(account.id),
      refresh_token: refreshToken,
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user,
    };
  }

  async handle(url: string, init?: RequestInit): Promise<Response> {
    const { pathname, search } = new URL(url);
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    this.calls.push({ path: pathname + search, body, headers: init?.headers as Record<string, string> });
    const json = (data: unknown) => new Response(JSON.stringify(data), { status: 200 });

    if (pathname === '/auth/v1/signup') {
      if (body.password.length < 10) return this.error(422, 'weak_password', 'Password should be at least 10 characters.');
      const existing = this.accounts.get(body.email);
      if (existing) return json({ id: randomUUID(), email: body.email, identities: [] });
      const account = { id: randomUUID(), email: body.email, password: body.password, confirmed: !this.confirmEmails, metadata: body.data };
      this.accounts.set(body.email, account);
      return json(this.confirmEmails ? { id: account.id, email: account.email, user_metadata: account.metadata, identities: [{}] } : await this.session(account));
    }
    if (pathname === '/auth/v1/token' && search === '?grant_type=password') {
      const account = this.accounts.get(body.email);
      if (!account || account.password !== body.password) return this.error(400, 'invalid_credentials', 'Invalid login credentials');
      if (!account.confirmed) return this.error(400, 'email_not_confirmed', 'Email not confirmed');
      return json(await this.session(account));
    }
    if (pathname === '/auth/v1/token' && search === '?grant_type=refresh_token') {
      const token = this.refreshTokens.get(body.refresh_token);
      // Supabase answers a malformed token with validation_failed, and an unknown one with refresh_token_not_found
      if (!body.refresh_token.includes('-')) return this.error(400, 'validation_failed', 'Refresh token is not valid');
      if (!token) return this.error(400, 'refresh_token_not_found', 'Invalid Refresh Token: Refresh Token Not Found');
      if (token.used) return this.error(400, 'refresh_token_already_used', 'Invalid Refresh Token: Already Used');
      token.used = true;
      const account = [...this.accounts.values()].find((a) => a.id === token.userId)!;
      return json(await this.session(account));
    }
    if (pathname === '/auth/v1/resend') {
      if (this.resendError) return this.error(...this.resendError);
      return json({});
    }
    if (pathname === '/auth/v1/logout') return new Response(null, { status: 204 });
    throw new Error(`Unexpected Supabase call ${pathname}`);
  }

  confirm(email: string) {
    this.accounts.get(email)!.confirmed = true;
  }
}

let supabase: FakeSupabase;

const account = {
  email: 'Sam@Example.com',
  password: 'correct horse battery',
  confirmPassword: 'correct horse battery',
  role: 'Trainer',
};

const signup = (overrides: object = {}) => api().post('/auth/signup').send({ ...account, ...overrides });
const login = (identifier: string, password = account.password) =>
  api().post('/auth/login').send({ identifier, password });

/** Signs up and confirms the email, as a user clicking the link would. */
async function confirmedAccount() {
  await signup();
  supabase.confirm('sam@example.com');
}

const giveUsername = () =>
  prisma.user.update({ where: { email: 'sam@example.com' }, data: { username: 'sam_chef' } });

beforeEach(async () => {
  await resetDatabase();
  supabase = new FakeSupabase();
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => supabase.handle(String(input), init));
});
afterEach(() => vi.restoreAllMocks());
afterAll(() => prisma.$disconnect());

describe('POST /auth/signup', () => {
  it('creates the Supabase account and a profile with the same id, pending email confirmation', async () => {
    const res = await signup();

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      user: {
        id: expect.any(String),
        email: 'sam@example.com',
        username: null,
        role: 'Trainer',
        displayName: null,
        avatarColor: null,
        createdAt: expect.any(String),
      },
      emailConfirmationRequired: true,
    });
    const supabaseAccount = supabase.accounts.get('sam@example.com')!;
    expect(res.body.user.id).toBe(supabaseAccount.id);
    expect(supabaseAccount.metadata).toEqual({ role: 'Trainer' });
    expect(supabase.calls[0].headers.apikey).toBe('sb_publishable_test');

    const profile = await prisma.user.findUniqueOrThrow({ where: { id: res.body.user.id }, include: { preferences: true } });
    expect(profile.preferences).toMatchObject({ mealReminders: true, showPrepTips: true });
  });

  it('signs the person in straight away when Supabase does not require confirmation', async () => {
    supabase.confirmEmails = false;
    const res = await signup();
    expect(res.body).toMatchObject({ emailConfirmationRequired: false, accessToken: expect.any(String), refreshToken: expect.any(String) });
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'sam@example.com' } });
    expect(user.emailConfirmedAt?.toISOString()).toBe(CONFIRMED_AT);
  });

  it('needs no username, and two accounts can both go without one', async () => {
    supabase.confirmEmails = false;
    expect((await signup()).status).toBe(201);
    expect((await signup({ email: 'second@example.com' })).status).toBe(201);
    expect(await prisma.user.count({ where: { username: null } })).toBe(2);
  });

  it('ignores a username sent by an older app', async () => {
    const res = await signup({ username: 'Sam_Chef' });
    expect(res.status).toBe(201);
    expect(res.body.user.username).toBeNull();
  });

  it('rejects a taken email without calling Supabase', async () => {
    await createUser({ email: 'sam@example.com', username: 'someone' });
    supabase.calls = [];

    const sameEmail = await signup({ email: 'SAM@example.COM' });
    expect(sameEmail.status).toBe(409);
    expect(sameEmail.body.detail).toBe('An account with this email already exists.');
    expect(supabase.calls).toHaveLength(0);
  });

  it('detects emails Supabase already knows (it hides them behind an empty user)', async () => {
    await signup();
    await prisma.user.deleteMany();

    const res = await signup();
    expect(res.status).toBe(409);
    expect(await prisma.user.count()).toBe(0);
  });

  it('passes on Supabase password rules', async () => {
    const res = await signup({ password: 'short pw', confirmPassword: 'short pw' });
    expect(res.status).toBe(400);
    expect(res.body.detail).toBe('Password should be at least 10 characters.');
  });

  it('validates like the app does', async () => {
    expect((await signup({ email: 'not-an-email' })).body.detail).toBe('Enter a valid email address.');
    expect((await signup({ password: 'short', confirmPassword: 'short' })).body.detail).toBe(
      'Password must contain at least 8 characters.',
    );
    expect((await signup({ confirmPassword: 'different!' })).body.detail).toBe('Passwords do not match.');
    expect((await signup({ role: 'Admin' })).status).toBe(400);
  });

  it('returns 502 when Supabase cannot be reached', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error('ECONNREFUSED'));
    expect((await signup()).status).toBe(502);
  });
});

describe('POST /auth/login', () => {
  it('asks for email confirmation first', async () => {
    await signup();
    const res = await login('sam@example.com');
    expect(res.status).toBe(403);
    expect(res.body.detail).toMatch(/confirm your email/);
  });

  it('logs in with email or username; usernames are resolved to the email for Supabase', async () => {
    await confirmedAccount();
    await giveUsername();
    for (const identifier of ['sam@example.com', 'SAM@EXAMPLE.COM', 'sam_chef', ' Sam_Chef ']) {
      supabase.calls = [];
      const res = await login(identifier);
      expect(res.status, identifier).toBe(200);
      expect(res.body).toEqual({
        user: expect.objectContaining({ email: 'sam@example.com', role: 'Trainer' }),
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresAt: expect.any(String),
      });
      expect(supabase.calls[0].body.email).toBe('sam@example.com');
    }
  });

  it('returns the same 401 for a wrong password and an unknown account', async () => {
    await confirmedAccount();
    const wrongPassword = await login('sam_chef', 'wrong password');
    const unknownUsername = await login('nobody');
    const unknownEmail = await login('nobody@example.com');
    expect(wrongPassword.status).toBe(401);
    expect(unknownUsername.body).toEqual(wrongPassword.body);
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });

  it('gives an access token the API accepts', async () => {
    await confirmedAccount();
    const { body } = await login('sam@example.com');
    const res = await api().get('/profile').set('Authorization', `Bearer ${body.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('sam@example.com');
  });

  it('rebuilds a missing profile from what was saved in Supabase at signup', async () => {
    await confirmedAccount();
    await prisma.user.deleteMany();

    const res = await login('sam@example.com');
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: 'sam@example.com', role: 'Trainer' });
  });

  it('blocks an account after 10 failed attempts from the same device', async () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      expect((await login('ratelimited@example.com', 'wrong')).status).toBe(401);
    }
    const blocked = await login('ratelimited@example.com', 'wrong');
    expect(blocked.status).toBe(429);
    expect(blocked.body.detail).toBe('Too many attempts, please try again later.');
  });
});

describe('stored user details', () => {
  const stored = () => prisma.user.findUniqueOrThrow({ where: { email: 'sam@example.com' } });

  it('saves the profile at signup, unconfirmed and never logged in', async () => {
    const { body } = await signup();
    expect(await stored()).toMatchObject({
      id: body.user.id,
      username: null,
      role: 'Trainer',
      authProvider: 'email',
      emailConfirmedAt: null,
      lastLoginAt: null,
    });
  });

  it('records the confirmation and the login time when logging in', async () => {
    await confirmedAccount();
    await login('sam@example.com');
    const user = await stored();
    expect(user.emailConfirmedAt?.toISOString()).toBe(CONFIRMED_AT);
    expect(user.lastLoginAt).toBeInstanceOf(Date);
  });

  it('rebuilds a missing profile on login with the same details', async () => {
    await confirmedAccount();
    await prisma.user.delete({ where: { email: 'sam@example.com' } });
    expect((await login('sam@example.com')).status).toBe(200);
    expect(await stored()).toMatchObject({ role: 'Trainer', authProvider: 'email' });
  });

  it('keeps Supabase data private to the server', async () => {
    await confirmedAccount();
    const { body } = await login('sam@example.com');
    expect(body.user).not.toHaveProperty('lastLoginAt');
    expect(body.user).not.toHaveProperty('authProvider');
  });
});

describe('POST /auth/resend-confirmation', () => {
  const resend = (identifier: string) => api().post('/auth/resend-confirmation').send({ identifier });
  const resendCalls = () => supabase.calls.filter((call) => call.path === '/auth/v1/resend');

  it('resends by email or username', async () => {
    await signup();
    await giveUsername();
    for (const identifier of ['sam@example.com', 'sam_chef']) {
      supabase.calls = [];
      expect((await resend(identifier)).status, identifier).toBe(202);
      expect(resendCalls()[0].body).toEqual({ type: 'signup', email: 'sam@example.com' });
    }
  });

  it('answers the same for an unknown username, without calling Supabase', async () => {
    const res = await resend('nobody_here');
    expect(res.status).toBe(202);
    expect(resendCalls()).toHaveLength(0);
  });

  it('hides refusals that would reveal the account state', async () => {
    await signup();
    supabase.resendError = [400, 'email_already_confirmed', 'Email already confirmed'];
    expect((await resend('sam@example.com')).status).toBe(202);
  });

  it('reports Supabase running out of emails', async () => {
    await signup();
    supabase.resendError = [429, 'over_email_send_rate_limit', 'Email rate limit exceeded'];
    const res = await resend('sam@example.com');
    expect(res.status).toBe(429);
    expect(res.body.detail).toMatch(/few minutes/);
  });

  it('limits repeated requests for one account', async () => {
    await signup();
    for (let attempt = 0; attempt < 5; attempt += 1) await resend('sam@example.com');
    expect((await resend('sam@example.com')).status).toBe(429);
  });

  it('requires an identifier', async () => {
    expect((await resend('')).status).toBe(400);
  });
});

describe('POST /auth/refresh', () => {
  it('returns a new session, and a used refresh token is rejected', async () => {
    await confirmedAccount();
    const { body: session } = await login('sam@example.com');

    const refreshed = await api().post('/auth/refresh').send({ refreshToken: session.refreshToken });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.refreshToken).not.toBe(session.refreshToken);
    expect(refreshed.body.user.email).toBe('sam@example.com');

    const reused = await api().post('/auth/refresh').send({ refreshToken: session.refreshToken });
    expect(reused.status).toBe(401);
    expect(reused.body.detail).toBe('Your session has expired, please log in again');
  });

  it('treats malformed and unknown refresh tokens as an expired session', async () => {
    for (const refreshToken of ['madeuptoken', 'made-up-token']) {
      const res = await api().post('/auth/refresh').send({ refreshToken });
      expect(res.status, refreshToken).toBe(401);
      expect(res.body.detail).toBe('Your session has expired, please log in again');
    }
  });
});

describe('POST /auth/logout', () => {
  it('ends the session at Supabase using the access token', async () => {
    await confirmedAccount();
    const { body: session } = await login('sam@example.com');

    const res = await api().post('/auth/logout').set('Authorization', `Bearer ${session.accessToken}`);

    expect(res.status).toBe(204);
    const logoutCall = supabase.calls.at(-1)!;
    expect(logoutCall.path).toBe('/auth/v1/logout?scope=local');
    expect(logoutCall.headers.Authorization).toBe(`Bearer ${session.accessToken}`);
  });

  it('requires an access token', async () => {
    expect((await api().post('/auth/logout')).status).toBe(401);
  });
});

describe('access tokens', () => {
  it('rejects expired tokens', async () => {
    const { id } = await createUser();
    const expired = await signAccessToken(id, '-1m');
    expect((await api().get('/profile').set('Authorization', `Bearer ${expired}`)).status).toBe(401);
  });
});

describe('signup rate limit', () => {
  it('allows 20 new accounts per device per hour', async () => {
    for (let n = 0; n < 20; n++) {
      expect((await signup({ email: `user${n}@example.com`, username: `user${n}` })).status).toBe(201);
    }
    expect((await signup({ email: 'one-more@example.com', username: 'onemore' })).status).toBe(429);
  });
});
