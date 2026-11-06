import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignJWT } from 'jose';
import { api, createUser, prisma, resetDatabase } from './helpers.js';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe('health', () => {
  it('reports healthy when the database is reachable', async () => {
    const res = await api().get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'healthy' });
  });
});

describe('authentication', () => {
  it('rejects requests without a token', async () => {
    const res = await api().get('/recipes');
    expect(res.status).toBe(401);
    expect(res.body.detail).toBe('Authentication required');
  });

  it('rejects tokens signed with another secret', async () => {
    const token = await new SignJWT()
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('6f1c2a8e-1111-4c4c-9c9c-123456789abc')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('some-other-secret-that-is-at-least-32-chars'));
    const res = await api().get('/recipes').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.detail).toBe('Invalid or expired token');
  });

  it('accepts a valid token', async () => {
    const { auth } = await createUser();
    const res = await api().get('/recipes').set('Authorization', auth);
    expect(res.status).toBe(200);
  });
});

describe('errors', () => {
  it('returns 404 JSON for unknown routes', async () => {
    const res = await api().get('/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ detail: 'Route not found' });
  });

  it('returns 400 for malformed JSON', async () => {
    const { auth } = await createUser();
    const res = await api()
      .post('/recipes')
      .set('Authorization', auth)
      .set('Content-Type', 'application/json')
      .send('{"title":');
    expect(res.status).toBe(400);
  });
});

describe('POST /research', () => {
  it('stores the agent result and returns it', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 'completed',
          output: [{ type: 'message', content: [{ type: 'output_text', text: 'Eat protein' }] }],
        }),
        { status: 200 },
      ),
    );
    const res = await api().post('/research').send({ query: 'high protein snacks' });
    const [url, init] = fetchMock.mock.calls[0];
    fetchMock.mockRestore();

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: 'completed', result: { answer: 'Eat protein' } });
    expect(url).toBe('http://agent.test/v1/responses');
    expect(JSON.parse(String(init?.body))).toMatchObject({ input: 'high protein snacks', store: false });
    const session = await prisma.researchSession.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(session.status).toBe('completed');
  });

  it('returns 502 and marks the session failed when the agent errors', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('', { status: 500 }));
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await api().post('/research').send({ query: 'high protein snacks' });
    fetchMock.mockRestore();
    errorLog.mockRestore();

    expect(res.status).toBe(502);
    const session = await prisma.researchSession.findFirstOrThrow();
    expect(session.status).toBe('failed');
  });

  it('rejects queries shorter than 3 characters', async () => {
    const res = await api().post('/research').send({ query: 'hi' });
    expect(res.status).toBe(400);
    expect(res.body.detail).toBe('query must contain at least 3 characters');
  });
});
