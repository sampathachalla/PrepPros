import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, createCatalogRecipe, createUser, prisma, resetDatabase } from './helpers.js';

const TOOLS_KEY = `Bearer ${process.env.AGENT_TOOLS_KEY}`;

let user: Awaited<ReturnType<typeof createUser>>;

beforeEach(async () => {
  await resetDatabase();
  user = await createUser();
});
afterEach(() => {
  vi.restoreAllMocks();
});
afterAll(() => prisma.$disconnect());

const hermesReply = (text: string, toolCalls: string[] = []) =>
  new Response(
    JSON.stringify({
      status: 'completed',
      output: [
        ...toolCalls.map((name) => ({ type: 'function_call', status: 'completed', name, arguments: '{}' })),
        { type: 'message', content: [{ type: 'output_text', text }] },
      ],
    }),
    { status: 200 },
  );

/** Mocks Hermes and returns what the API sent it. */
function mockHermes(...responses: Response[]) {
  const fetchMock = vi.spyOn(globalThis, 'fetch');
  for (const response of responses) fetchMock.mockResolvedValueOnce(response);
  return {
    request(index = 0) {
      const [url, init] = fetchMock.mock.calls[index];
      const headers = new Headers(init?.headers);
      return { url, authorization: headers.get('authorization'), body: JSON.parse(String(init?.body)) };
    },
    ticket(index = 0) {
      return /access_ticket: (\S+)/.exec(this.request(index).body.instructions)![1];
    },
  };
}

const sendMessage = (auth: string, conversationId: string, message: string) =>
  api().post('/chat/messages').set('Authorization', auth).send({ conversationId, message });

describe('POST /chat/messages', () => {
  it('requires authentication', async () => {
    const res = await api().post('/chat/messages').send({ conversationId: randomUUID(), message: 'Hi' });
    expect(res.status).toBe(401);
  });

  it('validates the message', async () => {
    const res = await sendMessage(user.auth, randomUUID(), '   ');
    expect(res.status).toBe(400);
    expect(res.body.detail).toBe('Please type a message');
  });

  it('asks Hermes in the user’s conversation and returns its reply with the tools it used', async () => {
    const hermes = mockHermes(hermesReply('Try the **Chicken Bowl**.', ['mcp_preppros_search_recipes', 'terminal']));
    const conversationId = randomUUID();

    const res = await sendMessage(user.auth, conversationId, ' Quick high-protein lunch? ');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      conversationId,
      message: { role: 'assistant', content: 'Try the **Chicken Bowl**.', toolsUsed: ['search_recipes'] },
    });
    const request = hermes.request();
    expect(request.url).toBe('http://agent.test/v1/responses');
    expect(request.authorization).toBe('Bearer test-hermes-api-key');
    expect(request.body).toMatchObject({
      input: 'Quick high-protein lunch?',
      conversation: `preppros:${user.id}:${conversationId}`,
      store: true,
    });
    expect(request.body.instructions).toMatch(/^access_ticket: \S{20,}\nToday's date: \d{4}-\d{2}-\d{2}$/);
  });

  it('reuses the ticket within a conversation and issues another for a new one', async () => {
    const hermes = mockHermes(hermesReply('One'), hermesReply('Two'), hermesReply('Three'));
    const conversationId = randomUUID();

    await sendMessage(user.auth, conversationId, 'First');
    await sendMessage(user.auth, conversationId, 'Second');
    await sendMessage(user.auth, randomUUID(), 'Elsewhere');

    expect(hermes.ticket(1)).toBe(hermes.ticket(0));
    expect(hermes.ticket(2)).not.toBe(hermes.ticket(0));
  });

  it('returns 502 when Hermes fails or gives no reply, and 503 when it is busy', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockHermes(
      new Response('boom', { status: 500 }),
      new Response(JSON.stringify({ status: 'failed', output: [] }), { status: 200 }),
      new Response('', { status: 429 }),
    );

    expect((await sendMessage(user.auth, randomUUID(), 'Hi')).status).toBe(502);
    expect((await sendMessage(user.auth, randomUUID(), 'Hi')).status).toBe(502);
    const busy = await sendMessage(user.auth, randomUUID(), 'Hi');
    expect(busy.status).toBe(503);
    expect(busy.body.detail).toBe('The assistant is busy, please try again in a moment');
  });
});

describe('/chat/tools', () => {
  /** A live ticket for the user, as the API would hand it to Hermes. */
  async function ticketFor(auth: string) {
    const hermes = mockHermes(hermesReply('Hello'));
    await sendMessage(auth, randomUUID(), 'Hello');
    vi.restoreAllMocks();
    return hermes.ticket();
  }

  const tools = (path: string, ticket: string, key = TOOLS_KEY) =>
    api().get(`/chat/tools${path}`).set('Authorization', key).set('X-Chat-Ticket', ticket);

  it('acts for the user the ticket was issued to', async () => {
    await createCatalogRecipe();
    const other = await createUser();
    const customRecipe = {
      category: 'breakfast',
      prepTimeMinutes: 5,
      servings: 1,
      ingredientsText: 'Oats',
      instructionsText: 'Soak overnight.',
    };
    await api().post('/recipes').set('Authorization', user.auth).send({ ...customRecipe, title: 'My Oats' });
    await api().post('/recipes').set('Authorization', other.auth).send({ ...customRecipe, title: 'Their Oats' });

    const res = await tools('/recipes', await ticketFor(user.auth));

    expect(res.status).toBe(200);
    expect(res.body.map((recipe: { title: string }) => recipe.title).sort()).toEqual(['Catalog Chicken Bowl', 'My Oats']);
  });

  it('bookmarks a recipe for the ticket’s user', async () => {
    const recipe = await createCatalogRecipe();
    const ticket = await ticketFor(user.auth);

    const res = await api()
      .put(`/chat/tools/recipes/${recipe.id}/bookmark`)
      .set('Authorization', TOOLS_KEY)
      .set('X-Chat-Ticket', ticket);

    expect(res.status).toBe(200);
    const bookmarks = await tools('/bookmarks', ticket);
    expect(bookmarks.body.map((bookmark: { recipeId?: string }) => bookmark.recipeId)).toEqual([recipe.id]);
  });

  it('rejects a wrong tools key and unknown tickets', async () => {
    const ticket = await ticketFor(user.auth);

    expect((await tools('/recipes', ticket, 'Bearer wrong-key')).status).toBe(401);
    expect((await tools('/recipes', ticket, `Bearer ${ticket}`)).status).toBe(401);
    const unknown = await tools('/recipes', 'not-a-real-ticket-000000000');
    expect(unknown.status).toBe(401);
    expect(unknown.body.detail).toMatch(/expired/);
  });

  it('is not reachable with a user access token', async () => {
    const res = await api().get('/chat/tools/recipes').set('Authorization', user.auth);
    expect(res.status).toBe(401);
  });
});
