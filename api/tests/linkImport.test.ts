import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../src/config/env.js';
import { findIngredients } from '../src/modules/bookmarks/recipeDetails.js';
import { enqueueScrape, processDueJobs } from '../src/modules/scrapeQueue/service.js';
import { reelRecord, youtubeVideo } from './fixtures.js';
import { api, createUser, prisma, resetDatabase } from './helpers.js';

vi.mock('youtube-caption-extractor', () => ({
  getSubtitles: vi.fn().mockResolvedValue([{ start: '0', dur: '1', text: 'two pounds of chicken' }]),
}));

const REEL = 'https://www.instagram.com/reel/C5Rdyj_q7YN/?igsh=abc';
const SHORT = 'https://youtube.com/shorts/abcdefghijk?si=track';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** A scripted Bright Data: `/trigger` hands out a snapshot, `/progress` answers from `progress`. */
function mockPlatforms(options: { progress?: () => string; records?: unknown[]; trigger?: () => Response } = {}) {
  const calls = { trigger: 0, snapshot: 0, triggered: [] as { dataset: string | null; url: string }[] };
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    if (url.includes('/datasets/v3/trigger')) {
      calls.trigger++;
      calls.triggered.push({
        dataset: new URL(url).searchParams.get('dataset_id'),
        url: JSON.parse(String(init?.body)).input[0].url,
      });
      return options.trigger?.() ?? json({ snapshot_id: 'sd_test123' });
    }
    if (url.includes('/datasets/v3/progress/')) return json({ status: options.progress?.() ?? 'ready' });
    if (url.includes('/datasets/v3/snapshot/')) {
      calls.snapshot++;
      return json(options.records ?? [reelRecord]);
    }
    return json({ items: [youtubeVideo] });
  });
  return calls;
}

/** Runs the queue as if the time a job asked to wait had passed. */
async function runQueue() {
  await prisma.scrapeJob.updateMany({ where: { status: { in: ['queued', 'running'] } }, data: { runAt: new Date(0) } });
  await processDueJobs();
}

let user: Awaited<ReturnType<typeof createUser>>;

const importLink = (url: string, auth = user.auth) =>
  api().post('/bookmarks/import').set('Authorization', auth).send({ url, via: 'share' });
const getBookmark = async (id: string, auth = user.auth) =>
  (await api().get(`/bookmarks/${id}`).set('Authorization', auth)).body;

beforeEach(async () => {
  await resetDatabase();
  user = await createUser();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());
afterAll(() => prisma.$disconnect());

describe('importing an Instagram reel', () => {
  it('answers at once, then fills the bookmark in once Bright Data is done', async () => {
    let status = 'running';
    const calls = mockPlatforms({ progress: () => status });

    const res = await importLink(REEL);

    expect(res.status).toBe(202);
    expect(res.body).toMatchObject({
      source: 'instagram',
      url: 'https://www.instagram.com/reel/C5Rdyj_q7YN/',
      importStatus: 'processing',
      ingredients: [],
    });
    expect(res.body.category).toBeUndefined();
    expect(calls.trigger).toBe(0); // the request never waits on Bright Data

    await runQueue(); // starts the scrape
    expect(await prisma.scrapeJob.findFirstOrThrow()).toMatchObject({ status: 'running', snapshotId: 'sd_test123' });
    await runQueue(); // still running
    expect((await getBookmark(res.body.id)).importStatus).toBe('processing');

    status = 'ready';
    await runQueue();

    expect(await getBookmark(res.body.id)).toMatchObject({
      importStatus: 'ready',
      title: 'High protein overnight oats 🥣',
      author: '@fitchef',
      category: 'breakfast',
      ingredients: ['oats', 'yogurt'],
      thumbnailUrl: 'https://cdn.instagram.test/thumb.jpg',
    });
    expect(await prisma.scrapeJob.findFirstOrThrow()).toMatchObject({ status: 'done', snapshotId: null });
    expect(calls.trigger).toBe(1);
  });

  it('stores the link under the user and the extracted content in Postgres', async () => {
    mockPlatforms();
    await importLink(REEL);
    await runQueue();
    await runQueue();

    const post = await prisma.socialPost.findFirstOrThrow({ include: { sharedLinks: true } });
    expect(post).toMatchObject({ status: 'ready', shortcode: 'C5Rdyj_q7YN', authorUsername: 'fitchef', raw: reelRecord });
    expect(post.sharedLinks).toMatchObject([{ userId: user.id, url: REEL, via: 'share' }]);
  });

  it('scrapes once when two users save the same reel, and fills in both', async () => {
    const calls = mockPlatforms();
    const other = await createUser();
    const mine = await importLink(REEL);
    const theirs = await importLink(REEL, other.auth);

    await runQueue();
    await runQueue();

    expect(calls.trigger).toBe(1);
    expect(await prisma.scrapeJob.count()).toBe(1);
    expect((await getBookmark(mine.body.id)).importStatus).toBe('ready');
    expect((await getBookmark(theirs.body.id, other.auth)).importStatus).toBe('ready');
    expect(await prisma.sharedLink.count()).toBe(2);
  });

  it('fills a new bookmark straight away, without paying again, when the post is already read', async () => {
    const calls = mockPlatforms();
    await importLink(REEL);
    await runQueue();
    await runQueue();

    const other = await createUser();
    const res = await importLink(REEL, other.auth);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ importStatus: 'ready', author: '@fitchef' });
    expect(calls.trigger).toBe(1);
  });

  it('returns the existing bookmark when a user saves the same link twice', async () => {
    mockPlatforms();
    const first = await importLink(REEL);
    const second = await importLink('https://instagram.com/reel/C5Rdyj_q7YN/');

    expect(second.body.id).toBe(first.body.id);
    expect(await prisma.bookmark.count()).toBe(1);
  });

  it('picks up a crashed worker’s scrape without starting a second one', async () => {
    const calls = mockPlatforms();
    await importLink(REEL);
    await runQueue();
    // The process died holding the job, with the lock still set
    await prisma.scrapeJob.updateMany({ data: { lockedUntil: new Date(Date.now() + 60_000), runAt: new Date(0) } });

    expect(await processDueJobs()).toBe(0); // locked: left alone

    await prisma.scrapeJob.updateMany({ data: { lockedUntil: new Date(0) } });
    await processDueJobs();

    expect(calls.trigger).toBe(1);
    expect((await prisma.scrapeJob.findFirstOrThrow()).status).toBe('done');
  });

  it('backs off after a temporary failure and then succeeds', async () => {
    let healthy = false;
    mockPlatforms({ trigger: () => (healthy ? json({ snapshot_id: 'sd_ok' }) : json({ error: 'busy' }, 500)) });
    const res = await importLink(REEL);

    await processDueJobs();

    const job = await prisma.scrapeJob.findFirstOrThrow();
    expect(job).toMatchObject({ status: 'running', attempts: 1, lastError: 'Could not read this Instagram link right now' });
    expect(job.runAt.getTime()).toBeGreaterThan(Date.now() + 20_000);
    expect((await getBookmark(res.body.id)).importStatus).toBe('processing');

    healthy = true;
    await runQueue();
    await runQueue();
    expect((await getBookmark(res.body.id)).importStatus).toBe('ready');
  });

  it('starts over when Bright Data fails a scrape', async () => {
    const calls = mockPlatforms({ progress: () => 'failed' });
    await importLink(REEL);
    await runQueue();
    await runQueue();

    expect(await prisma.scrapeJob.findFirstOrThrow()).toMatchObject({ snapshotId: null, attempts: 1 });
    await runQueue();
    expect(calls.trigger).toBe(2);
  });

  it('falls back to the posts scraper when retrying a reel', async () => {
    const calls = mockPlatforms({ progress: () => 'failed' });
    await importLink(REEL);
    await runQueue();
    await runQueue();
    await runQueue();

    expect(calls.triggered).toEqual([
      { dataset: 'gd_lyclm20il4r5helnj', url: 'https://www.instagram.com/reel/C5Rdyj_q7YN/' },
      { dataset: 'gd_lk5ns7kz21pck8jpis', url: 'https://www.instagram.com/p/C5Rdyj_q7YN/' },
    ]);
  });

  it('abandons a scrape that never finishes', async () => {
    mockPlatforms({ progress: () => 'running' });
    await importLink(REEL);
    await runQueue();
    await prisma.scrapeJob.updateMany({ data: { snapshotStartedAt: new Date(Date.now() - 11 * 60 * 1000) } });

    await runQueue();

    expect(await prisma.scrapeJob.findFirstOrThrow()).toMatchObject({ snapshotId: null, attempts: 1 });
  });

  it('gives up after repeated failures, and retry works once the problem clears', async () => {
    let healthy = false;
    const calls = mockPlatforms({ trigger: () => (healthy ? json({ snapshot_id: 'sd_ok' }) : json({}, 500)) });
    const res = await importLink(REEL);

    for (let attempt = 0; attempt < 5; attempt++) await runQueue();

    expect(calls.trigger).toBe(5);
    expect(await getBookmark(res.body.id)).toMatchObject({
      importStatus: 'failed',
      importError: 'Could not read this Instagram link right now',
    });
    await runQueue();
    expect(calls.trigger).toBe(5);

    healthy = true;
    const retried = await api().post(`/bookmarks/${res.body.id}/retry`).set('Authorization', user.auth);
    expect(retried.status).toBe(202);
    expect(retried.body).toMatchObject({ importStatus: 'processing' });
    expect(retried.body.importError).toBeUndefined();

    await runQueue();
    await runQueue();
    expect((await getBookmark(res.body.id)).importStatus).toBe('ready');
  });

  it('fails at once on a private or deleted post', async () => {
    const calls = mockPlatforms({ records: [{ error: 'Page not found', error_code: 'dead_page' }] });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const res = await importLink(REEL);

    await runQueue();
    await runQueue();

    expect(await getBookmark(res.body.id)).toMatchObject({
      importStatus: 'failed',
      importError: 'This Instagram post is private or unavailable',
    });
    expect(await prisma.scrapeJob.findFirstOrThrow()).toMatchObject({ status: 'failed', attempts: 1 });
    expect(calls.trigger).toBe(1);
  });

  it('retries when Instagram blocks the crawler, rather than calling the post private', async () => {
    let blocked = true;
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const blockRecord = { error: 'Crawler error: Unexpected token <', error_code: 'crawl_error' };
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/trigger')) return json({ snapshot_id: 'sd_retry' });
      if (url.includes('/progress/')) return json({ status: 'ready' });
      return json(blocked ? [blockRecord] : [reelRecord]);
    });
    const res = await importLink(REEL);

    await runQueue();
    await runQueue();
    expect(await prisma.scrapeJob.findFirstOrThrow()).toMatchObject({ attempts: 1, snapshotId: null });
    expect((await getBookmark(res.body.id)).importStatus).toBe('processing');

    blocked = false;
    await runQueue();
    await runQueue();
    expect((await getBookmark(res.body.id)).importStatus).toBe('ready');
  });

  it('re-saving a failed link tries it again', async () => {
    mockPlatforms({ records: [{ error_code: 'dead_page' }] });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await importLink(REEL);
    await runQueue();
    await runQueue();

    const again = await importLink(REEL);

    expect(again.body.importStatus).toBe('processing');
    expect((await prisma.scrapeJob.findFirstOrThrow()).status).toBe('queued');
  });

  it('only retries the caller’s own failed bookmarks', async () => {
    mockPlatforms();
    const res = await importLink(REEL);
    const other = await createUser();

    expect((await api().post(`/bookmarks/${res.body.id}/retry`).set('Authorization', other.auth)).status).toBe(404);
    expect((await api().post(`/bookmarks/${res.body.id}/retry`).set('Authorization', user.auth)).status).toBe(409);
  });
});

describe('the wait shown while importing', () => {
  /** A finished job that took `seconds`, as if imported earlier. */
  async function finishedJob(platform: 'instagram' | 'youtube', seconds: number, finishedAgoMinutes = 1) {
    const shortcode = Math.random().toString(36).slice(2, 12);
    const finishedAt = new Date(Date.now() - finishedAgoMinutes * 60_000);
    await prisma.socialPost.create({
      data: {
        platform,
        contentType: platform === 'instagram' ? 'reel' : 'video',
        shortcode,
        url: `https://example.test/${shortcode}`,
        status: 'ready',
        scrapeJob: {
          create: { status: 'done', finishedAt, enqueuedAt: new Date(finishedAt.getTime() - seconds * 1000) },
        },
      },
    });
  }

  it('starts from a default before anything has finished', async () => {
    mockPlatforms();
    const reel = await importLink(REEL);
    const short = await importLink(SHORT);

    expect(reel.body.importEstimate).toEqual({ averageSeconds: 60, elapsedSeconds: expect.any(Number) });
    expect(short.body.importEstimate.averageSeconds).toBe(10);
  });

  it('averages each platform’s finished imports separately', async () => {
    mockPlatforms();
    await finishedJob('instagram', 30);
    await finishedJob('instagram', 90);
    await finishedJob('youtube', 4);

    const reel = await importLink(REEL);
    const short = await importLink(SHORT);

    expect(reel.body.importEstimate.averageSeconds).toBe(60);
    expect(short.body.importEstimate.averageSeconds).toBe(4);
  });

  it('only counts recent imports, so it follows how the scraper is doing now', async () => {
    mockPlatforms();
    for (let i = 0; i < 20; i++) await finishedJob('instagram', 40, i + 1);
    await finishedJob('instagram', 9000, 500);

    expect((await importLink(REEL)).body.importEstimate.averageSeconds).toBe(40);
  });

  it('counts time since the job joined the queue, even in the list', async () => {
    mockPlatforms();
    await importLink(REEL);
    await prisma.scrapeJob.updateMany({ data: { enqueuedAt: new Date(Date.now() - 42_000) } });

    const list = await api().get('/bookmarks').set('Authorization', user.auth);

    expect(list.body[0].importEstimate.elapsedSeconds).toBeGreaterThanOrEqual(42);
    expect(list.body[0].importEstimate.elapsedSeconds).toBeLessThan(50);
  });

  it('records real durations, and restarts the clock on retry', async () => {
    mockPlatforms({ records: [{ error_code: 'dead_page' }] });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const res = await importLink(REEL);
    await runQueue();
    await runQueue();
    await prisma.scrapeJob.updateMany({ data: { enqueuedAt: new Date(0) } });

    const retried = await api().post(`/bookmarks/${res.body.id}/retry`).set('Authorization', user.auth);

    expect(retried.body.importEstimate.elapsedSeconds).toBeLessThan(5);

    vi.restoreAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockPlatforms();
    await runQueue();
    await runQueue();
    const job = await prisma.scrapeJob.findFirstOrThrow();
    expect(job.finishedAt).not.toBeNull();
  });

  it('drops the estimate once the bookmark is ready or has failed', async () => {
    mockPlatforms();
    const res = await importLink(REEL);
    await runQueue();
    await runQueue();
    expect((await getBookmark(res.body.id)).importEstimate).toBeUndefined();
  });
});

describe('importing a YouTube link', () => {
  it('stores the video’s content and fills in the bookmark', async () => {
    mockPlatforms();
    const res = await importLink(SHORT);
    expect(res.status).toBe(202);

    await processDueJobs();

    expect(await getBookmark(res.body.id)).toMatchObject({
      importStatus: 'ready',
      title: 'Air Fryer Chicken Fajita Bowls #cooking',
      author: 'Chef Sam',
    });
    expect(await prisma.socialPost.findFirstOrThrow()).toMatchObject({
      platform: 'youtube',
      transcript: 'two pounds of chicken',
      caption: 'Easy meal prep #mealprep #highprotein',
    });
  });
});

describe('POST /bookmarks/import validation', () => {
  it('rejects unsupported links before storing anything', async () => {
    for (const url of ['https://example.com/recipe', 'https://www.instagram.com/fitchef/', 'not a url']) {
      expect((await importLink(url)).status).toBe(400);
    }
    expect(await prisma.socialPost.count()).toBe(0);
  });

  it('limits how fast links can be imported', async () => {
    mockPlatforms();
    for (let i = 0; i < 20; i++) await importLink(`https://www.instagram.com/reel/code${i}/`);
    expect((await importLink('https://www.instagram.com/reel/onemore/')).status).toBe(429);
  });
});

describe('POST /bookmarks', () => {
  it('queues links saved with their details, so their content still gets read', async () => {
    mockPlatforms();
    await api()
      .post('/bookmarks')
      .set('Authorization', user.auth)
      .send({ url: SHORT, title: 'Saved', category: 'snacks' });

    await processDueJobs();

    expect((await prisma.socialPost.findFirstOrThrow()).status).toBe('ready');
    expect((await prisma.bookmark.findFirstOrThrow()).title).toBe('Saved'); // what the user typed stays
  });
});

describe('TEMP_USER_ID', () => {
  afterEach(() => {
    env.TEMP_USER_ID = undefined;
  });

  it('is off by default: no token means 401', async () => {
    const res = await api().post('/bookmarks/import').send({ url: REEL });
    expect(res.status).toBe(401);
  });

  it('owns imports made without a token', async () => {
    mockPlatforms();
    env.TEMP_USER_ID = user.id;

    const res = await api().post('/bookmarks/import').send({ url: REEL });

    expect(res.status).toBe(202);
    expect(await prisma.sharedLink.findFirstOrThrow()).toMatchObject({ userId: user.id });
    expect((await prisma.bookmark.findFirstOrThrow()).userId).toBe(user.id);
  });

  it('never replaces a real user’s token', async () => {
    mockPlatforms();
    const real = await createUser();
    env.TEMP_USER_ID = user.id;

    await importLink(REEL, real.auth);

    expect((await prisma.bookmark.findFirstOrThrow()).userId).toBe(real.id);
  });

  it('does not rescue a bad token', async () => {
    env.TEMP_USER_ID = user.id;
    const res = await api().get('/bookmarks').set('Authorization', 'Bearer not-a-token');
    expect(res.status).toBe(401);
  });

  it('only covers bookmarks', async () => {
    env.TEMP_USER_ID = user.id;
    expect((await api().get('/profile')).status).toBe(401);
    expect((await api().get('/social-posts')).status).toBe(401);
  });
});

describe('reading recipe details from captions', () => {
  const details = async (caption: string) => {
    mockPlatforms({ records: [{ ...reelRecord, description: caption, hashtags: [] }] });
    const res = await importLink(REEL);
    await runQueue();
    await runQueue();
    return getBookmark(res.body.id);
  };

  it('reads stated times and servings, and leaves the rest empty', async () => {
    const stated = await details('Chicken fajita bowls\nPrep time: 15 min\nCook time: 20 mins\nServes 4');
    expect(stated).toMatchObject({ prepTimeMinutes: 15, cookTimeMinutes: 20, servings: 4 });

    await resetDatabase();
    user = await createUser();
    const silent = await details('Air fry this for 12 minutes, so good');
    expect(silent.prepTimeMinutes).toBeUndefined();
    expect(silent.servings).toBeUndefined();
    expect(silent.category).toBeUndefined();
  });

  it('finds ingredient lists in the shapes creators write them', () => {
    expect(findIngredients('Ingredients:\n\n- 2 eggs\n• 1 cup oats\n✅ salt\n\nEnjoy!')).toEqual([
      '2 eggs',
      '1 cup oats',
      'salt',
    ]);
    expect(findIngredients('INGREDIENTS: chicken, rice, beans')).toEqual(['chicken', 'rice', 'beans']);
    expect(findIngredients('Ingredients\n1 egg\nInstructions\nMix it')).toEqual(['1 egg']);
    expect(findIngredients('Ingredients\n1 egg\n#mealprep')).toEqual(['1 egg']);
    expect(findIngredients('So tasty, no list here')).toEqual([]);
    expect(findIngredients('Ingredients:\n1 egg\n\nFollow me for more recipes')).toEqual(['1 egg']);
  });

  it('copes with a real recipe caption', async () => {
    const caption = [
      '#ad | HEALTHIER THAN A TAKEAWAY 🌿🐟',
      '',
      'Had the ingredients delivered to my door in under an hour.',
      'The recipe serves 2 and takes around 35 minutes!',
      '',
      'Ingredients (serves 2)',
      '300g hake',
      '4 tbsp green curry paste',
      '',
      'To serve',
      '10g coriander, roughly chopped',
      'Juice of 1 lime',
      '',
      'Method',
      '1. Preheat the oven to 200°C fan.',
    ].join('\n');

    expect(await details(caption)).toMatchObject({
      title: 'HEALTHIER THAN A TAKEAWAY 🌿🐟',
      servings: 2,
      prepTimeMinutes: 35,
      ingredients: ['300g hake', '4 tbsp green curry paste', '10g coriander, roughly chopped', 'Juice of 1 lime'],
    });
  });
});

describe('enqueueScrape', () => {
  it('does not disturb a job that is already under way', async () => {
    mockPlatforms();
    const res = await importLink(REEL);
    await runQueue();
    const post = await prisma.socialPost.findFirstOrThrow();

    await enqueueScrape(post.id);

    expect(await prisma.scrapeJob.findFirstOrThrow()).toMatchObject({ status: 'running', snapshotId: 'sd_test123' });
    expect(res.status).toBe(202);
  });
});
