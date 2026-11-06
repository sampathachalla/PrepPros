import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSupabasePool } from '../src/modules/supabaseSync/db.js';
import { syncPending } from '../src/modules/supabaseSync/service.js';
import { reelRecord, youtubeVideo } from './fixtures.js';
import { api, createUser, prisma, resetDatabase, supabaseDb } from './helpers.js';

vi.mock('youtube-caption-extractor', () => ({
  getSubtitles: vi.fn().mockResolvedValue([{ start: '0', dur: '1', text: 'two pounds of chicken' }]),
}));

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

/** Answers Bright Data with the sample reel and the YouTube API with the sample video. */
function mockPlatforms() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) =>
    String(input).includes('brightdata') ? json([reelRecord]) : json({ items: [youtubeVideo] }),
  );
}

let user: Awaited<ReturnType<typeof createUser>>;
const preview = (url: string, via?: string) =>
  api().post('/bookmarks/preview').set('Authorization', user.auth).send({ url, via });

const supabaseRows = async <T = Record<string, unknown>>(sql: string) => (await supabaseDb().query(sql)).rows as T[];

beforeEach(async () => {
  await resetDatabase();
  user = await createUser();
});
afterEach(() => vi.restoreAllMocks());
afterAll(() => prisma.$disconnect());

describe('copying to Supabase', () => {
  it('copies an Instagram post with all its extracted content, and who shared it', async () => {
    mockPlatforms();
    const res = await preview('https://www.instagram.com/reel/C5Rdyj_q7YN/?igsh=abc', 'share');

    const [post] = await supabaseRows('SELECT * FROM preppros.social_posts');
    expect(post).toMatchObject({
      id: res.body.socialPostId,
      platform: 'instagram',
      shortcode: 'C5Rdyj_q7YN',
      status: 'ready',
      author_username: 'fitchef',
      caption: reelRecord.description,
      hashtags: ['mealprep', 'protein'],
      likes_count: '3470337',
      raw: reelRecord,
    });

    const [link] = await supabaseRows('SELECT * FROM preppros.shared_links');
    expect(link).toMatchObject({
      user_id: user.id,
      social_post_id: res.body.socialPostId,
      url: 'https://www.instagram.com/reel/C5Rdyj_q7YN/?igsh=abc',
      via: 'share',
      share_count: 1,
    });
  });

  it('copies YouTube links without their content', async () => {
    mockPlatforms();
    await preview('https://youtube.com/shorts/abcdefghijk');

    const [post] = await supabaseRows('SELECT * FROM preppros.social_posts');
    expect(post).toMatchObject({
      platform: 'youtube',
      content_type: 'short',
      url: 'https://www.youtube.com/shorts/abcdefghijk',
      status: 'ready',
      author_username: null,
      caption: null,
      hashtags: [],
      raw: null,
    });
    expect(post).not.toHaveProperty('transcript');
    // The local database keeps everything
    const local = await prisma.socialPost.findFirstOrThrow();
    expect(local.transcript).toBe('two pounds of chicken');
  });

  it('counts each time a user provides the same link, but not the save right after a preview', async () => {
    mockPlatforms();
    const url = 'https://www.instagram.com/reel/C5Rdyj_q7YN/';
    await preview(url);
    await preview(url, 'share');
    await api().post('/bookmarks').set('Authorization', user.auth).send({ url, title: 'Oats', category: 'breakfast' });

    const [link] = await supabaseRows<{ share_count: number; via: string }>('SELECT * FROM preppros.shared_links');
    expect(link).toMatchObject({ share_count: 2, via: 'share' });
    expect(await prisma.sharedLink.count()).toBe(1);
  });

  it('keeps the request working when Supabase is down, and copies the rows later', async () => {
    mockPlatforms();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const pool = getSupabasePool()!;
    const query = vi.spyOn(pool, 'query').mockRejectedValue(new Error('connection refused'));

    const res = await preview('https://www.instagram.com/reel/C5Rdyj_q7YN/');

    expect(res.status).toBe(200);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('will retry'));
    expect(await prisma.sharedLink.findFirstOrThrow()).toMatchObject({ supabaseSyncedAt: null });

    query.mockRestore();
    expect(await syncPending()).toBe(2); // the post and the shared link
    expect(await supabaseRows('SELECT id FROM preppros.shared_links')).toHaveLength(1);
    expect(await syncPending()).toBe(0);
  });

  it('copies a post again when it changes', async () => {
    mockPlatforms();
    await preview('https://www.instagram.com/reel/C5Rdyj_q7YN/');
    await prisma.socialPost.updateMany({ data: { caption: 'Updated caption' } });

    expect(await syncPending()).toBe(1);
    const [post] = await supabaseRows<{ caption: string }>('SELECT caption FROM preppros.social_posts');
    expect(post.caption).toBe('Updated caption');
  });

  it('records a link even when it can not be read', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json([{ error: 'Page not found', error_code: 'dead_page' }]));

    const res = await preview('https://www.instagram.com/reel/DEADPOST123/');

    expect(res.status).toBe(422);
    const [post] = await supabaseRows('SELECT status, scrape_error FROM preppros.social_posts');
    expect(post).toEqual({ status: 'failed', scrape_error: 'This Instagram post is private or unavailable' });
    expect(await supabaseRows('SELECT id FROM preppros.shared_links')).toHaveLength(1);
  });

  it('does not store links from unsupported sites', async () => {
    expect((await preview('https://example.com/recipe')).status).toBe(400);
    expect(await prisma.sharedLink.count()).toBe(0);
  });
});

describe('Supabase tables', () => {
  it('have row level security switched on', async () => {
    const rows = await supabaseRows<{ relname: string; relrowsecurity: boolean }>(`
      SELECT relname, relrowsecurity FROM pg_class
      WHERE relnamespace = 'preppros'::regnamespace AND relname IN ('social_posts', 'shared_links')
      ORDER BY relname`);
    expect(rows).toEqual([
      { relname: 'shared_links', relrowsecurity: true },
      { relname: 'social_posts', relrowsecurity: true },
    ]);
  });
});
