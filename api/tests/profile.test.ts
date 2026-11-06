import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { api, createCatalogRecipe, createUser, prisma, resetDatabase } from './helpers.js';

let auth: string;

beforeEach(async () => {
  await resetDatabase();
  ({ auth } = await createUser({ email: 'sam@example.com', username: 'sam', role: 'Member' }));
});
afterAll(() => prisma.$disconnect());

const getProfile = () => api().get('/profile').set('Authorization', auth);

describe('GET /profile', () => {
  it('returns the account, preferences and stats', async () => {
    const res = await getProfile();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: expect.any(String),
      email: 'sam@example.com',
      username: 'sam',
      role: 'Member',
      displayName: null,
      avatarColor: null,
      createdAt: expect.any(String),
      preferences: { mealReminders: true, showPrepTips: true },
      stats: { recipesSaved: 0, bookmarks: 0, mealsPlanned: 0 },
    });
  });

  it('counts the user’s own recipes and bookmarks', async () => {
    const catalog = await createCatalogRecipe();
    await api()
      .post('/recipes')
      .set('Authorization', auth)
      .send({
        title: 'My oats',
        category: 'breakfast',
        prepTimeMinutes: 5,
        servings: 1,
        ingredientsText: 'Oats',
        instructionsText: 'Mix it all.',
      });
    await api().put(`/recipes/${catalog.id}/bookmark`).set('Authorization', auth);

    expect((await getProfile()).body.stats).toEqual({ recipesSaved: 1, bookmarks: 1, mealsPlanned: 0 });
  });

  it('creates default preferences for older accounts that have none', async () => {
    await prisma.userPreferences.deleteMany();
    expect((await getProfile()).body.preferences).toEqual({ mealReminders: true, showPrepTips: true });
  });

  it('requires a login, and rejects tokens of deleted accounts', async () => {
    expect((await api().get('/profile')).status).toBe(401);
    await prisma.user.deleteMany();
    expect((await getProfile()).status).toBe(401);
  });
});

describe('PATCH /profile', () => {
  it('changes username and role', async () => {
    const res = await api().patch('/profile').set('Authorization', auth).send({ username: 'Chef_Sam', role: 'Trainer' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ username: 'chef_sam', role: 'Trainer' });
  });

  it('allows keeping the same username but not taking someone else’s', async () => {
    await createUser({ email: 'alex@example.com', username: 'alex' });

    expect((await api().patch('/profile').set('Authorization', auth).send({ username: 'sam' })).status).toBe(200);
    const taken = await api().patch('/profile').set('Authorization', auth).send({ username: 'ALEX' });
    expect(taken.status).toBe(409);
    expect(taken.body.detail).toBe('This username is taken.');
  });

  it('validates the username', async () => {
    const res = await api().patch('/profile').set('Authorization', auth).send({ username: 'no spaces' });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /profile/preferences', () => {
  it('updates only the fields sent', async () => {
    const res = await api().patch('/profile/preferences').set('Authorization', auth).send({ mealReminders: false });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ mealReminders: false, showPrepTips: true });
    expect((await getProfile()).body.preferences).toEqual({ mealReminders: false, showPrepTips: true });
  });

  it('rejects non-boolean values', async () => {
    const res = await api().patch('/profile/preferences').set('Authorization', auth).send({ showPrepTips: 'yes' });
    expect(res.status).toBe(400);
  });
});
