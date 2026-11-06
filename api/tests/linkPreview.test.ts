import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSubtitles } from 'youtube-caption-extractor';
import { titleFromCaption } from '../src/modules/bookmarks/preview.js';
import { reelRecord, youtubeVideo } from './fixtures.js';
import { api, createUser, prisma, resetDatabase } from './helpers.js';

vi.mock('youtube-caption-extractor', () => ({ getSubtitles: vi.fn() }));
const getSubtitlesMock = vi.mocked(getSubtitles);

type FetchHandler = (url: string, init?: RequestInit) => Response | Promise<Response>;

/** Routes outgoing fetch calls (YouTube, Bright Data) to a handler and records them. */
function mockFetch(handler: FetchHandler) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (input, init) => handler(String(input), init));
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

let auth: string;

beforeEach(async () => {
  await resetDatabase();
  auth = (await createUser()).auth;
  getSubtitlesMock.mockResolvedValue([
    { start: '0.5', dur: '2', text: 'Take 2 lbs of\nchicken,' },
    { start: '2.5', dur: '2', text: 'one bell pepper.' },
  ]);
});
afterEach(() => vi.restoreAllMocks());
afterAll(() => prisma.$disconnect());

const preview = (url: string) => api().post('/bookmarks/preview').set('Authorization', auth).send({ url });

describe('POST /bookmarks/preview — YouTube', () => {
  it('reads details from the Data API and the transcript from captions', async () => {
    const fetchMock = mockFetch(() => json({ items: [youtubeVideo] }));

    const res = await preview('https://youtube.com/shorts/abcdefghijk?si=track');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      socialPostId: expect.any(String),
      source: 'youtube',
      url: 'https://www.youtube.com/shorts/abcdefghijk',
      title: 'Air Fryer Chicken Fajita Bowls #cooking',
      author: 'Chef Sam',
      thumbnailUrl: 'https://i.ytimg.com/vi/abcdefghijk/maxresdefault.jpg',
      description: 'Easy meal prep #mealprep #highprotein',
      transcript: 'Take 2 lbs of chicken, one bell pepper.',
    });

    const calledUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(calledUrl.origin + calledUrl.pathname).toBe('https://www.googleapis.com/youtube/v3/videos');
    expect(calledUrl.searchParams.get('id')).toBe('abcdefghijk');
    expect(calledUrl.searchParams.get('key')).toBe('test-youtube-key');
    expect(getSubtitlesMock).toHaveBeenCalledWith({ videoID: 'abcdefghijk', lang: 'en' });
  });

  it('stores the video as a social post', async () => {
    mockFetch(() => json({ items: [youtubeVideo] }));
    const res = await preview('https://youtu.be/abcdefghijk');

    const post = await prisma.socialPost.findUniqueOrThrow({ where: { id: res.body.socialPostId } });
    expect(post).toMatchObject({
      platform: 'youtube',
      contentType: 'video',
      shortcode: 'abcdefghijk',
      url: 'https://www.youtube.com/watch?v=abcdefghijk',
      authorUsername: 'Chef Sam',
      authorProfileUrl: 'https://www.youtube.com/channel/UC123',
      hashtags: ['cooking', 'mealprep', 'highprotein'],
      durationSeconds: 76,
      viewsCount: 1832712355n,
      likesCount: 1000n,
      commentsCount: 25,
      transcriptLanguage: 'en',
      status: 'ready',
    });
    expect(post.raw).toMatchObject({ video: { id: 'abcdefghijk' }, captions: [{ text: 'Take 2 lbs of\nchicken,' }, {}] });
  });

  it('still succeeds without a transcript when captions are unavailable', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    getSubtitlesMock.mockRejectedValueOnce(new Error('No captions found'));
    mockFetch(() => json({ items: [youtubeVideo] }));

    const res = await preview('https://www.youtube.com/watch?v=abcdefghijk');

    expect(res.status).toBe(200);
    expect(res.body.transcript).toBeUndefined();
  });

  it('returns 422 and remembers videos that are private or removed', async () => {
    mockFetch(() => json({ items: [] }));
    const res = await preview('https://www.youtube.com/watch?v=abcdefghijk');

    expect(res.status).toBe(422);
    expect(res.body.detail).toBe('This YouTube video is private or unavailable');
    const post = await prisma.socialPost.findFirstOrThrow();
    expect(post).toMatchObject({ status: 'failed', scrapeError: 'This YouTube video is private or unavailable' });
  });

  it('returns 502 when the API key is rejected or out of quota', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockFetch(() => json({ error: { code: 403, message: 'quotaExceeded' } }, 403));

    const res = await preview('https://www.youtube.com/watch?v=abcdefghijk');

    expect(res.status).toBe(502);
    expect(errorLog).toHaveBeenCalledWith('YouTube Data API returned HTTP 403');
    // The link the user gave is still remembered, waiting to be read
    const post = await prisma.socialPost.findFirstOrThrow({ include: { sharedLinks: true } });
    expect(post).toMatchObject({ status: 'pending', shortcode: 'abcdefghijk' });
    expect(post.sharedLinks).toHaveLength(1);
  });

  it('returns 400 for YouTube links that are not videos', async () => {
    const fetchMock = mockFetch(() => json({}));
    const res = await preview('https://www.youtube.com/@somechannel');
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('POST /bookmarks/preview — Instagram via Bright Data', () => {
  it('scrapes a reel and builds the preview from its caption', async () => {
    const fetchMock = mockFetch(() => json([reelRecord]));

    const res = await preview('https://www.instagram.com/reel/C5Rdyj_q7YN/?igsh=abc');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      socialPostId: expect.any(String),
      source: 'instagram',
      url: 'https://www.instagram.com/reel/C5Rdyj_q7YN/',
      title: 'High protein overnight oats 🥣',
      author: '@fitchef',
      thumbnailUrl: 'https://cdn.instagram.test/thumb.jpg',
      description: reelRecord.description,
    });

    const [calledUrl, init] = fetchMock.mock.calls[0];
    expect(String(calledUrl)).toBe(
      'https://api.brightdata.com/datasets/v3/scrape?dataset_id=gd_lyclm20il4r5helnj&format=json&notify=false&include_errors=true',
    );
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer test-bright-data-key');
    expect(JSON.parse(String(init?.body))).toEqual({ input: [{ url: 'https://www.instagram.com/reel/C5Rdyj_q7YN/' }] });
  });

  it('stores the typed fields and the full Bright Data record', async () => {
    mockFetch(() => json([reelRecord]));
    const res = await preview('https://www.instagram.com/reel/C5Rdyj_q7YN/');

    const post = await prisma.socialPost.findUniqueOrThrow({ where: { id: res.body.socialPostId } });
    expect(post).toMatchObject({
      platform: 'instagram',
      contentType: 'reel',
      shortcode: 'C5Rdyj_q7YN',
      externalId: '3337579816830088717',
      authorUsername: 'fitchef',
      authorAvatarUrl: 'https://cdn.instagram.test/avatar.jpg',
      authorFollowers: 220234,
      hashtags: ['mealprep', 'protein'],
      videoUrl: 'https://cdn.instagram.test/video.mp4',
      likesCount: 3470337n,
      commentsCount: 7859,
      viewsCount: 9000000n,
      postedAt: new Date('2024-04-02T20:44:39.000Z'),
      title: null,
      transcript: null,
      status: 'ready',
    });
    expect(post.durationSeconds).toBeCloseTo(46.8, 1);
    expect(post.raw).toEqual(reelRecord);
  });

  it('reuses the stored post instead of paying for a second scrape', async () => {
    const fetchMock = mockFetch(() => json([reelRecord]));

    const first = await preview('https://www.instagram.com/reel/C5Rdyj_q7YN/');
    const second = await preview('https://www.instagram.com/fitchef/reel/C5Rdyj_q7YN/?igsh=x');

    expect(second.body).toEqual(first.body);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await prisma.socialPost.count()).toBe(1);
  });

  it('scrapes again once the stored copy is older than a day', async () => {
    const fetchMock = mockFetch(() => json([reelRecord]));
    await preview('https://www.instagram.com/reel/C5Rdyj_q7YN/');
    await prisma.socialPost.updateMany({ data: { scrapedAt: new Date(Date.now() - 25 * 60 * 60 * 1000) } });

    await preview('https://www.instagram.com/reel/C5Rdyj_q7YN/');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('uses the posts dataset for /p/ links, including links with a username', async () => {
    const fetchMock = mockFetch(() =>
      json([{ ...reelRecord, thumbnail: undefined, photos: ['https://cdn.instagram.test/p1.jpg'] }]),
    );

    const res = await preview('https://www.instagram.com/fitchef/p/Cuf4s0MNqNr/');

    expect(String(fetchMock.mock.calls[0][0])).toContain('dataset_id=gd_lk5ns7kz21pck8jpis');
    expect(res.body.url).toBe('https://www.instagram.com/p/Cuf4s0MNqNr/');
    expect(res.body.thumbnailUrl).toBe('https://cdn.instagram.test/p1.jpg');
  });

  it('waits for the snapshot when Bright Data needs more than a minute', async () => {
    const fetchMock = mockFetch((url) => {
      if (url.includes('/scrape')) return json({ snapshot_id: 's_123' }, 202);
      if (url.includes('/progress/s_123')) return json({ status: 'ready' });
      if (url.includes('/snapshot/s_123')) return json([reelRecord]);
      throw new Error(`Unexpected fetch ${url}`);
    });

    const res = await preview('https://www.instagram.com/reel/C5Rdyj_q7YN/');

    expect(res.status).toBe(200);
    expect(res.body.author).toBe('@fitchef');
    expect(fetchMock.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual([
      '/datasets/v3/scrape',
      '/datasets/v3/progress/s_123',
      '/datasets/v3/snapshot/s_123',
    ]);
  });

  it('returns 422 when the post is private or deleted', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockFetch(() => json([{ error: 'Page not found', error_code: 'dead_page' }]));
    const res = await preview('https://www.instagram.com/reel/C5Rdyj_q7YN/');
    expect(res.status).toBe(422);
    expect(res.body.detail).toBe('This Instagram post is private or unavailable');
  });

  it('returns 502 without leaking details when Bright Data rejects the request', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockFetch(() => new Response('invalid token', { status: 401 }));
    const res = await preview('https://www.instagram.com/reel/C5Rdyj_q7YN/');
    expect(res.status).toBe(502);
    expect(res.body.detail).toBe('Could not read this Instagram link right now');
    expect(errorLog).toHaveBeenCalledWith(expect.stringContaining('HTTP 401'));
  });

  it('returns 400 for Instagram links that are not a post or reel', async () => {
    const fetchMock = mockFetch(() => json([]));
    const res = await preview('https://www.instagram.com/fitchef/');
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('POST /bookmarks/preview — validation', () => {
  it('rejects other sites and requires a login', async () => {
    expect((await preview('https://example.com/recipe')).status).toBe(400);
    const anonymous = await api().post('/bookmarks/preview').send({ url: 'https://youtu.be/abcdefghijk' });
    expect(anonymous.status).toBe(401);
  });
});

describe('titleFromCaption', () => {
  it('uses the first line without hashtags', () => {
    expect(titleFromCaption('#mealprep\n\nEasy chicken wraps #protein #easy\nmore')).toBe('Easy chicken wraps');
  });

  it('shortens long lines at a word boundary', () => {
    const title = titleFromCaption('word '.repeat(40))!;
    expect(title.length).toBeLessThanOrEqual(100);
    expect(title.endsWith('word…')).toBe(true);
  });

  it('returns undefined when the caption is only hashtags', () => {
    expect(titleFromCaption('#a #b\n#c')).toBeUndefined();
  });
});
