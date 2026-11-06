import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, createUser, prisma, resetDatabase } from './helpers.js';
import { reelRecord } from './fixtures.js';

vi.mock('youtube-caption-extractor', () => ({ getSubtitles: vi.fn().mockResolvedValue([]) }));

let auth: string;

beforeEach(async () => {
  await resetDatabase();
  auth = (await createUser()).auth;
});
afterAll(() => prisma.$disconnect());

function storePost(overrides: Partial<Parameters<typeof prisma.socialPost.create>[0]['data']> = {}) {
  return prisma.socialPost.create({
    data: {
      platform: 'instagram',
      contentType: 'reel',
      shortcode: `code${Math.random().toString(36).slice(2, 8)}`,
      url: 'https://www.instagram.com/reel/x/',
      authorUsername: 'fitchef',
      caption: 'Chicken fajita bowls',
      hashtags: ['mealprep'],
      likesCount: 3470337n,
      status: 'ready',
      scrapedAt: new Date(),
      raw: { anything: true },
      ...overrides,
    },
  });
}

describe('GET /social-posts', () => {
  it('lists ready posts without the raw record', async () => {
    const post = await storePost();
    await storePost({ status: 'failed', shortcode: 'gone' });

    const res = await api().get('/social-posts').set('Authorization', auth);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: post.id, likesCount: 3470337, authorUsername: 'fitchef' });
    expect(res.body[0].raw).toBeUndefined();
  });

  it('filters by platform, hashtag, author and text search (including transcripts)', async () => {
    await storePost({ shortcode: 'a', hashtags: ['mealprep'], caption: 'Overnight oats' });
    await storePost({ shortcode: 'b', hashtags: ['dessert'], authorUsername: 'bakerbee', caption: 'Brownies' });
    await storePost({
      platform: 'youtube',
      contentType: 'short',
      shortcode: 'c',
      caption: null,
      transcript: 'take two pounds of chicken',
    });
    const titles = async (query: string) =>
      (await api().get(`/social-posts?${query}`).set('Authorization', auth)).body.map(
        (post: { shortcode: string }) => post.shortcode,
      );

    expect(await titles('platform=youtube')).toEqual(['c']);
    expect(await titles('hashtag=%23Dessert')).toEqual(['b']);
    expect(await titles('author=BAKERBEE')).toEqual(['b']);
    expect(await titles('search=oats')).toEqual(['a']);
    expect(await titles('search=pounds of chicken')).toEqual(['c']);
  });

  it('pages with limit and offset', async () => {
    for (const shortcode of ['a', 'b', 'c']) await storePost({ shortcode });
    const res = await api().get('/social-posts?limit=2&offset=2').set('Authorization', auth);
    expect(res.body).toHaveLength(1);
  });
});

describe('GET /social-posts/:id', () => {
  it('returns one post, or 404', async () => {
    const post = await storePost();
    expect((await api().get(`/social-posts/${post.id}`).set('Authorization', auth)).body.id).toBe(post.id);
    const missing = await api().get('/social-posts/6f1c2a8e-1111-4c4c-9c9c-123456789abc').set('Authorization', auth);
    expect(missing.status).toBe(404);
  });
});

describe('bookmarks and stored posts', () => {
  it('links an imported bookmark to the post read by the preview', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify([reelRecord]), { status: 200 }),
    );
    const preview = await api()
      .post('/bookmarks/preview')
      .set('Authorization', auth)
      .send({ url: 'https://www.instagram.com/reel/C5Rdyj_q7YN/' });

    const bookmark = await api()
      .post('/bookmarks')
      .set('Authorization', auth)
      .send({ url: preview.body.url, title: preview.body.title, category: 'breakfast' });

    expect(bookmark.status).toBe(201);
    expect(bookmark.body.socialPostId).toBe(preview.body.socialPostId);
  });

  it('remembers links saved without a preview as pending posts', async () => {
    const bookmark = await api()
      .post('/bookmarks')
      .set('Authorization', auth)
      .send({ url: 'https://www.instagram.com/reel/NEVERSEEN1/', title: 'Later', category: 'snacks', via: 'share' });

    const post = await prisma.socialPost.findUniqueOrThrow({ where: { id: bookmark.body.socialPostId } });
    expect(post).toMatchObject({ status: 'pending', shortcode: 'NEVERSEEN1', caption: null });
    expect(await prisma.sharedLink.findFirstOrThrow()).toMatchObject({ via: 'share', shareCount: 1 });
  });
});

describe('social_post_embeddings (pgvector)', () => {
  it('stores vectors of any size and checks the declared dimensions', async () => {
    const post = await storePost();
    await prisma.$executeRaw`
      INSERT INTO social_post_embeddings (social_post_id, model, dimensions, content, embedding)
      VALUES (${post.id}::uuid, 'test-model', 3, 'chicken fajita bowls', '[0.1,0.2,0.3]'::vector)`;

    const [nearest] = await prisma.$queryRaw<{ content: string; distance: number }[]>`
      SELECT content, embedding <=> '[0.1,0.2,0.31]'::vector AS distance
      FROM social_post_embeddings WHERE model = 'test-model' ORDER BY distance LIMIT 1`;
    expect(nearest.content).toBe('chicken fajita bowls');
    expect(nearest.distance).toBeLessThan(0.01);

    await expect(prisma.$executeRaw`
      INSERT INTO social_post_embeddings (social_post_id, model, dimensions, content, embedding)
      VALUES (${post.id}::uuid, 'other-model', 4, 'x', '[1,2,3]'::vector)`).rejects.toThrow(/dimensions_check/);
  });

  it('deletes embeddings with their post', async () => {
    const post = await storePost();
    await prisma.$executeRaw`
      INSERT INTO social_post_embeddings (social_post_id, model, dimensions, content, embedding)
      VALUES (${post.id}::uuid, 'test-model', 2, 'x', '[1,2]'::vector)`;
    await prisma.socialPost.delete({ where: { id: post.id } });
    expect(await prisma.socialPostEmbedding.count()).toBe(0);
  });
});
