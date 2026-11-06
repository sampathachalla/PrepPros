import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { api, createCatalogRecipe, createUser, prisma, resetDatabase } from './helpers.js';

const youtubeImport = {
  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=tracking123',
  title: 'Protein Pancakes',
  category: 'breakfast',
  prepTimeMinutes: 10,
  cookTimeMinutes: 10,
  ingredientsText: 'Oats\nEggs\n\nBanana',
};

let user: Awaited<ReturnType<typeof createUser>>;

beforeEach(async () => {
  await resetDatabase();
  user = await createUser();
});
afterAll(() => prisma.$disconnect());

const importBookmark = (body: object, auth = user.auth) =>
  api().post('/bookmarks').set('Authorization', auth).send(body);

describe('POST /bookmarks', () => {
  it('imports a YouTube link with defaults and a cleaned URL', async () => {
    const res = await importBookmark(youtubeImport);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      source: 'youtube',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Protein Pancakes',
      author: '@YouTubeChef',
      category: 'breakfast',
      ingredients: ['Oats', 'Eggs', 'Banana'],
      thumbnailUrl: expect.stringContaining('https://images.unsplash.com/'),
    });
    expect(res.body.recipeId).toBeUndefined();
  });

  it('detects Instagram links', async () => {
    const res = await importBookmark({
      url: 'https://www.instagram.com/reel/abc123/?igsh=xyz',
      title: 'Reel recipe',
      category: 'snacks',
      author: '@chef',
    });
    expect(res.body).toMatchObject({
      source: 'instagram',
      url: 'https://www.instagram.com/reel/abc123/',
      author: '@chef',
    });
  });

  it('rejects links from other sites, including look-alike hosts', async () => {
    for (const url of ['https://example.com/recipe', 'https://notyoutube.com/watch?v=1']) {
      const res = await importBookmark({ ...youtubeImport, url });
      expect(res.status).toBe(400);
      expect(res.body.detail).toMatch(/Only Instagram/);
    }
  });

  it('rejects a source that does not match the link', async () => {
    const res = await importBookmark({ ...youtubeImport, source: 'instagram' });
    expect(res.status).toBe(400);
  });

  it('rejects non-http URLs and negative times', async () => {
    expect((await importBookmark({ ...youtubeImport, url: 'ftp://youtube.com/x' })).status).toBe(400);
    expect((await importBookmark({ ...youtubeImport, prepTimeMinutes: -1 })).status).toBe(400);
  });
});

describe('GET /bookmarks', () => {
  async function seedBookmarks() {
    await importBookmark({ ...youtubeImport, title: 'Slow Stew', category: 'lunch_dinner', prepTimeMinutes: 30, cookTimeMinutes: 90 });
    await importBookmark({ ...youtubeImport, title: 'Apple Snack', category: 'snacks', prepTimeMinutes: 2, cookTimeMinutes: 0 });
    const recipe = await createCatalogRecipe('Banana Bowl');
    await api().put(`/recipes/${recipe.id}/bookmark`).set('Authorization', user.auth);
  }

  const titles = (body: { title: string }[]) => body.map((b) => b.title);

  it('lists only the caller’s bookmarks, newest first', async () => {
    await seedBookmarks();
    const other = await createUser();
    await importBookmark({ ...youtubeImport, title: 'Someone else’s' }, other.auth);

    const res = await api().get('/bookmarks').set('Authorization', user.auth);
    expect(res.status).toBe(200);
    expect(titles(res.body)).toEqual(['Banana Bowl', 'Apple Snack', 'Slow Stew']);
  });

  it('filters by source, category and search', async () => {
    await seedBookmarks();
    const get = (query: string) => api().get(`/bookmarks?${query}`).set('Authorization', user.auth);

    expect(titles((await get('source=app')).body)).toEqual(['Banana Bowl']);
    expect(titles((await get('category=snacks')).body)).toEqual(['Apple Snack']);
    expect(titles((await get('search=stew')).body)).toEqual(['Slow Stew']);
  });

  it('sorts by title and by total time', async () => {
    await seedBookmarks();
    const get = (sort: string) => api().get(`/bookmarks?sort=${sort}`).set('Authorization', user.auth);

    expect(titles((await get('title_asc')).body)).toEqual(['Apple Snack', 'Banana Bowl', 'Slow Stew']);
    expect(titles((await get('time')).body)).toEqual(['Apple Snack', 'Banana Bowl', 'Slow Stew']);
  });
});

describe('GET/DELETE /bookmarks/:id', () => {
  it('gets and deletes the caller’s bookmark', async () => {
    const created = await importBookmark(youtubeImport);

    const got = await api().get(`/bookmarks/${created.body.id}`).set('Authorization', user.auth);
    expect(got.body).toEqual(created.body);

    const deleted = await api().delete(`/bookmarks/${created.body.id}`).set('Authorization', user.auth);
    expect(deleted.status).toBe(204);
    expect(await prisma.bookmark.count()).toBe(0);
  });

  it('hides other users’ bookmarks', async () => {
    const other = await createUser();
    const created = await importBookmark(youtubeImport, other.auth);

    expect((await api().get(`/bookmarks/${created.body.id}`).set('Authorization', user.auth)).status).toBe(404);
    expect((await api().delete(`/bookmarks/${created.body.id}`).set('Authorization', user.auth)).status).toBe(404);
    expect(await prisma.bookmark.count()).toBe(1);
  });

  it('un-bookmarks the recipe when its app bookmark is deleted', async () => {
    const recipe = await createCatalogRecipe();
    const saved = await api().put(`/recipes/${recipe.id}/bookmark`).set('Authorization', user.auth);

    await api().delete(`/bookmarks/${saved.body.bookmark.id}`).set('Authorization', user.auth);

    const res = await api().get(`/recipes/${recipe.id}`).set('Authorization', user.auth);
    expect(res.body.isBookmarked).toBe(false);
  });
});
