import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { api, createCatalogRecipe, createUser, prisma, resetDatabase } from './helpers.js';

const newRecipe = {
  title: 'My Overnight Oats',
  category: 'breakfast',
  prepTimeMinutes: 5,
  servings: 2,
  ingredientsText: 'Rolled oats\n\nAlmond milk\n  Chia seeds  ',
  instructionsText: 'Mix everything.\nRefrigerate overnight.',
};

let user: Awaited<ReturnType<typeof createUser>>;

beforeEach(async () => {
  await resetDatabase();
  user = await createUser();
});
afterAll(() => prisma.$disconnect());

describe('GET /recipes', () => {
  it('lists catalog recipes plus only the caller’s own custom recipes', async () => {
    await createCatalogRecipe();
    const other = await createUser();
    await api().post('/recipes').set('Authorization', other.auth).send({ ...newRecipe, title: 'Not mine' });
    await api().post('/recipes').set('Authorization', user.auth).send(newRecipe);

    const res = await api().get('/recipes').set('Authorization', user.auth);

    expect(res.status).toBe(200);
    expect(res.body.map((r: { title: string }) => r.title).sort()).toEqual([
      'Catalog Chicken Bowl',
      'My Overnight Oats',
    ]);
  });

  it('returns recipes in the mobile app’s shape', async () => {
    const recipe = await createCatalogRecipe();
    const res = await api().get('/recipes').set('Authorization', user.auth);

    expect(res.body[0]).toEqual({
      id: recipe.id,
      title: 'Catalog Chicken Bowl',
      category: 'high_protein',
      prepTimeMinutes: 15,
      cookTimeMinutes: 20,
      servings: 4,
      difficulty: 'Easy',
      imageUrl: 'https://example.com/bowl.jpg',
      isBookmarked: false,
      isCustom: false,
      ingredients: [
        { id: expect.any(String), name: 'Chicken breast', amount: '600g' },
        { id: expect.any(String), name: 'Quinoa' },
      ],
      steps: [{ stepNumber: 1, instruction: 'Cook everything.' }],
      createdAt: recipe.createdAt.toISOString(),
    });
  });

  it('filters by category and search', async () => {
    await createCatalogRecipe();
    await api().post('/recipes').set('Authorization', user.auth).send(newRecipe);

    const byCategory = await api().get('/recipes?category=breakfast').set('Authorization', user.auth);
    expect(byCategory.body.map((r: { title: string }) => r.title)).toEqual(['My Overnight Oats']);

    const bySearch = await api().get('/recipes?search=chicken').set('Authorization', user.auth);
    expect(bySearch.body.map((r: { title: string }) => r.title)).toEqual(['Catalog Chicken Bowl']);
  });

  it('rejects an unknown category', async () => {
    const res = await api().get('/recipes?category=pizza').set('Authorization', user.auth);
    expect(res.status).toBe(400);
  });
});

describe('POST /recipes', () => {
  it('creates a custom recipe, splitting ingredients and steps by line', async () => {
    const res = await api().post('/recipes').set('Authorization', user.auth).send(newRecipe);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'My Overnight Oats',
      category: 'breakfast',
      difficulty: 'Easy',
      isCustom: true,
      isBookmarked: false,
      imageUrl: expect.stringContaining('https://'),
      steps: [
        { stepNumber: 1, instruction: 'Mix everything.' },
        { stepNumber: 2, instruction: 'Refrigerate overnight.' },
      ],
    });
    expect(res.body.ingredients.map((i: { name: string }) => i.name)).toEqual([
      'Rolled oats',
      'Almond milk',
      'Chia seeds',
    ]);
  });

  it('files the "all" category under lunch_dinner, like the app does', async () => {
    const res = await api()
      .post('/recipes')
      .set('Authorization', user.auth)
      .send({ ...newRecipe, category: 'all' });
    expect(res.body.category).toBe('lunch_dinner');
  });

  it('returns the first validation message as detail', async () => {
    const res = await api()
      .post('/recipes')
      .set('Authorization', user.auth)
      .send({ ...newRecipe, title: 'A' });
    expect(res.status).toBe(400);
    expect(res.body.detail).toBe('Recipe title must be at least 2 characters');
    expect(res.body.errors[0].path).toBe('title');
  });
});

describe('GET /recipes/:id', () => {
  it('returns 404 for another user’s custom recipe', async () => {
    const other = await createUser();
    const created = await api().post('/recipes').set('Authorization', other.auth).send(newRecipe);

    const res = await api().get(`/recipes/${created.body.id}`).set('Authorization', user.auth);
    expect(res.status).toBe(404);
  });

  it('returns 400 for a malformed id', async () => {
    const res = await api().get('/recipes/recipe-1').set('Authorization', user.auth);
    expect(res.status).toBe(400);
  });
});

describe('DELETE /recipes/:id', () => {
  it('deletes the caller’s own recipe', async () => {
    const created = await api().post('/recipes').set('Authorization', user.auth).send(newRecipe);
    const res = await api().delete(`/recipes/${created.body.id}`).set('Authorization', user.auth);

    expect(res.status).toBe(204);
    expect(await prisma.recipe.count()).toBe(0);
  });

  it('refuses to delete catalog recipes', async () => {
    const recipe = await createCatalogRecipe();
    const res = await api().delete(`/recipes/${recipe.id}`).set('Authorization', user.auth);

    expect(res.status).toBe(403);
    expect(await prisma.recipe.count()).toBe(1);
  });

  it('returns 404 for another user’s recipe and leaves it in place', async () => {
    const other = await createUser();
    const created = await api().post('/recipes').set('Authorization', other.auth).send(newRecipe);
    const res = await api().delete(`/recipes/${created.body.id}`).set('Authorization', user.auth);

    expect(res.status).toBe(404);
    expect(await prisma.recipe.count()).toBe(1);
  });
});

describe('recipe bookmarks', () => {
  it('bookmarks a recipe once, even when called twice', async () => {
    const recipe = await createCatalogRecipe();

    const first = await api().put(`/recipes/${recipe.id}/bookmark`).set('Authorization', user.auth);
    const second = await api().put(`/recipes/${recipe.id}/bookmark`).set('Authorization', user.auth);

    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({
      isBookmarked: true,
      bookmark: {
        source: 'app',
        recipeId: recipe.id,
        title: 'Catalog Chicken Bowl',
        author: 'PrepPros Kitchen',
        ingredients: ['Chicken breast', 'Quinoa'],
        notes: 'Difficulty: Easy',
      },
    });
    expect(second.body.bookmark.id).toBe(first.body.bookmark.id);
    expect(await prisma.bookmark.count()).toBe(1);

    const detail = await api().get(`/recipes/${recipe.id}`).set('Authorization', user.auth);
    expect(detail.body.isBookmarked).toBe(true);
  });

  it('is per user', async () => {
    const recipe = await createCatalogRecipe();
    const other = await createUser();
    await api().put(`/recipes/${recipe.id}/bookmark`).set('Authorization', other.auth);

    const res = await api().get(`/recipes/${recipe.id}`).set('Authorization', user.auth);
    expect(res.body.isBookmarked).toBe(false);
  });

  it('removes the bookmark', async () => {
    const recipe = await createCatalogRecipe();
    await api().put(`/recipes/${recipe.id}/bookmark`).set('Authorization', user.auth);

    const res = await api().delete(`/recipes/${recipe.id}/bookmark`).set('Authorization', user.auth);

    expect(res.status).toBe(204);
    expect(await prisma.bookmark.count()).toBe(0);
  });

  it('removes bookmarks when the recipe is deleted', async () => {
    const created = await api().post('/recipes').set('Authorization', user.auth).send(newRecipe);
    await api().put(`/recipes/${created.body.id}/bookmark`).set('Authorization', user.auth);

    await api().delete(`/recipes/${created.body.id}`).set('Authorization', user.auth);
    expect(await prisma.bookmark.count()).toBe(0);
  });
});
