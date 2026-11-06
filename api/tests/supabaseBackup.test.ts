import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../src/config/env.js';
import { backupPending, startSupabaseBackup, stopSupabaseBackup } from '../src/modules/supabaseBackup/service.js';
import { reelRecord } from './fixtures.js';
import { createUser, prisma, resetDatabase } from './helpers.js';

const STORAGE = 'https://test-project.supabase.co/storage/v1';

interface Upload {
  path: string;
  lines: Record<string, unknown>[];
  headers: Record<string, string>;
}

/** Stands in for Supabase Storage and records what was uploaded. */
function mockStorage(respond: (url: string) => Response = () => new Response('{}', { status: 200 })) {
  const uploads: Upload[] = [];
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const response = respond(url);
    if (response.ok && url.startsWith(`${STORAGE}/object/`)) {
      uploads.push({
        path: url.replace(`${STORAGE}/object/`, ''),
        lines: String(init?.body).trim().split('\n').map((line) => JSON.parse(line)),
        headers: init?.headers as Record<string, string>,
      });
    }
    return response;
  });
  return { uploads, fetchMock };
}

async function savePost(platform: 'instagram' | 'youtube', status: 'ready' | 'pending' = 'ready') {
  return prisma.socialPost.create({
    data: {
      platform,
      contentType: platform === 'instagram' ? 'reel' : 'video',
      shortcode: `${platform}${Math.random().toString(36).slice(2, 8)}`,
      url: `https://${platform}.test/post`,
      status,
      caption: 'A caption',
      transcript: platform === 'youtube' ? 'spoken words' : undefined,
      raw: status === 'ready' ? reelRecord : undefined,
    },
  });
}

const shareLink = (userId: string, socialPostId: string) =>
  prisma.sharedLink.create({ data: { userId, socialPostId, url: 'https://shared.test/link?igsh=x', via: 'share' } });

let user: Awaited<ReturnType<typeof createUser>>;

beforeEach(async () => {
  await resetDatabase();
  user = await createUser();
  env.SUPABASE_SECRET_KEY = 'sb_secret_test';
});
afterEach(() => {
  env.SUPABASE_SECRET_KEY = undefined;
  vi.restoreAllMocks();
});
afterAll(() => prisma.$disconnect());

describe('JSONL backup to Supabase Storage', () => {
  it('writes links with their user ids, for both platforms', async () => {
    const reel = await savePost('instagram');
    const video = await savePost('youtube');
    await shareLink(user.id, reel.id);
    await shareLink(user.id, video.id);
    const { uploads } = mockStorage();

    await backupPending();

    const links = uploads.find(({ path }) => path.includes('/links/'))!;
    expect(links.path).toMatch(/^preppros-backups\/links\/\d{4}\/\d{2}\/\d{2}\/\d+-[\w-]+\.jsonl$/);
    expect(links.lines).toHaveLength(2);
    expect(links.lines).toContainEqual(
      expect.objectContaining({ type: 'link', user_id: user.id, platform: 'youtube', via: 'share', url: 'https://shared.test/link?igsh=x' }),
    );
  });

  it('writes Instagram’s extracted content with who shared it, and never YouTube’s', async () => {
    const reel = await savePost('instagram');
    const video = await savePost('youtube');
    await shareLink(user.id, reel.id);
    const { uploads } = mockStorage();

    await backupPending();

    const content = uploads.find(({ path }) => path.includes('/instagram/'))!;
    expect(content.lines).toEqual([
      expect.objectContaining({ type: 'instagram_content', id: reel.id, user_ids: [user.id], raw: reelRecord }),
    ]);
    expect(JSON.stringify(uploads)).not.toContain(video.id);
    expect(JSON.stringify(uploads)).not.toContain('spoken words');
  });

  it('waits for Instagram content that has not been read yet', async () => {
    await savePost('instagram', 'pending');
    const { uploads } = mockStorage();
    await backupPending();
    expect(uploads).toEqual([]);
  });

  it('writes each row once, and again only when it changes', async () => {
    const reel = await savePost('instagram');
    const link = await shareLink(user.id, reel.id);
    const { uploads } = mockStorage();

    expect(await backupPending()).toBe(2);
    expect(await backupPending()).toBe(0);

    await prisma.sharedLink.update({ where: { id: link.id }, data: { shareCount: 2 } });
    expect(await backupPending()).toBe(1);
    expect(uploads).toHaveLength(3);
  });

  it('keeps rows pending when an upload fails, then catches up', async () => {
    const reel = await savePost('instagram');
    await shareLink(user.id, reel.id);
    mockStorage(() => new Response('down', { status: 503 }));

    await expect(backupPending()).rejects.toThrow(/HTTP 503/);
    expect((await prisma.sharedLink.findFirstOrThrow()).supabaseBackedUpAt).toBeNull();

    vi.restoreAllMocks();
    const { uploads } = mockStorage();
    await backupPending();
    expect(uploads).toHaveLength(2);
  });

  it('sends sb_secret keys only as apikey', async () => {
    await shareLink(user.id, (await savePost('youtube')).id);
    const { uploads } = mockStorage();

    await backupPending();

    expect(uploads[0].headers).toMatchObject({ apikey: 'sb_secret_test' });
    expect(uploads[0].headers.Authorization).toBeUndefined();
  });

  it('sends a legacy service_role key as the bearer token too', async () => {
    env.SUPABASE_SECRET_KEY = 'eyJhbGciOi.legacy.jwt';
    await shareLink(user.id, (await savePost('youtube')).id);
    const { uploads } = mockStorage();

    await backupPending();

    expect(uploads[0].headers).toMatchObject({
      apikey: 'eyJhbGciOi.legacy.jwt',
      Authorization: 'Bearer eyJhbGciOi.legacy.jwt',
    });
  });

  it('does nothing without a key, and leaves rows for later', async () => {
    env.SUPABASE_SECRET_KEY = undefined;
    await shareLink(user.id, (await savePost('youtube')).id);
    const { fetchMock } = mockStorage();

    expect(await backupPending()).toBe(0);

    expect(fetchMock).not.toHaveBeenCalled();
    expect((await prisma.sharedLink.findFirstOrThrow()).supabaseBackedUpAt).toBeNull();
  });

  it('creates a private bucket on startup and accepts one that already exists', async () => {
    const { fetchMock } = mockStorage((url) =>
      url.endsWith('/bucket')
        ? new Response(JSON.stringify({ statusCode: '409', error: 'Duplicate', message: 'already exists' }), { status: 400 })
        : new Response('{}', { status: 200 }),
    );
    await shareLink(user.id, (await savePost('youtube')).id);

    startSupabaseBackup();
    await vi.waitFor(async () => {
      expect((await prisma.sharedLink.findFirstOrThrow()).supabaseBackedUpAt).not.toBeNull();
    });
    stopSupabaseBackup();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${STORAGE}/bucket`);
    expect(JSON.parse(String(init?.body))).toEqual({ id: 'preppros-backups', name: 'preppros-backups', public: false });
  });
});
