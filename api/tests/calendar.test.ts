import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { api, createCatalogRecipe, createHousehold, createUser, prisma, resetDatabase } from './helpers.js';

const key = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const TOMORROW = key(1);
const NEXT_DAY = key(2);

let admin: Awaited<ReturnType<typeof createUser>>;
let member: Awaited<ReturnType<typeof createUser>>;

beforeEach(async () => {
  await resetDatabase();
  ({ admin, member } = await createHousehold());
});
afterAll(() => prisma.$disconnect());

const add = (auth: string, body: object) =>
  api().post('/calendar/dishes').set('Authorization', auth).send({ date: TOMORROW, meal: 'dinner', ...body });
const calendar = async (auth: string, from = TOMORROW, to = NEXT_DAY) =>
  (await api().get(`/calendar?from=${from}&to=${to}`).set('Authorization', auth)).body;
const startTimer = (auth = admin.auth, dates = [TOMORROW], durationMinutes = 60) =>
  api().post('/calendar/timer').set('Authorization', auth).send({ dates, durationMinutes });
const accept = (auth: string, id: string) => api().post(`/calendar/dishes/${id}/accept`).set('Authorization', auth);
const decide = (auth: string, id: string, approve: boolean) =>
  api().post(`/calendar/dishes/${id}/decision`).set('Authorization', auth).send({ approve });

async function createThirdMember() {
  const other = await createUser({ username: 'anu' });
  const { household } = (await api().get('/household').set('Authorization', admin.auth)).body;
  await api().post('/household/join').set('Authorization', other.auth).send({ code: household.inviteCode });
  return { other };
}

/** Runs a day's timer out, as if the time had passed. */
const expireTimer = () => prisma.mealDay.updateMany({ data: { votingEndsAt: new Date(Date.now() - 1000) } });

async function openDay() {
  const dish = await add(admin.auth, { name: 'Chicken Curry' });
  await startTimer();
  return dish.body.id as string;
}

describe('access', () => {
  it('needs a login and a household', async () => {
    expect((await api().get(`/calendar?from=${TOMORROW}&to=${NEXT_DAY}`)).status).toBe(401);
    const loner = await createUser();
    const res = await api().get(`/calendar?from=${TOMORROW}&to=${NEXT_DAY}`).set('Authorization', loner.auth);
    expect(res.status).toBe(409);
    expect(res.body.detail).toMatch(/household/);
  });

  it('keeps households apart', async () => {
    const dishId = await openDay();
    const outsider = await createUser();
    await api().post('/household').set('Authorization', outsider.auth).send({ name: 'Other' });

    expect((await calendar(outsider.auth)).dishes).toEqual([]);
    expect((await accept(outsider.auth, dishId)).status).toBe(404);
    expect((await decide(outsider.auth, dishId, false)).status).toBe(404);
    expect((await api().delete(`/calendar/dishes/${dishId}`).set('Authorization', outsider.auth)).status).toBe(404);
  });

  it('checks dates and ranges', async () => {
    const get = (query: string) => api().get(`/calendar?${query}`).set('Authorization', admin.auth);
    expect((await get('from=2026-02-30&to=2026-03-01')).status).toBe(400);
    expect((await get(`from=${NEXT_DAY}&to=${TOMORROW}`)).status).toBe(400);
    expect((await get(`from=${key(0)}&to=${key(100)}`)).status).toBe(400);
  });
});

describe('the admin plans the day', () => {
  it('keeps a draft from members until the timer starts', async () => {
    await add(admin.auth, { name: 'Chicken Curry' });

    expect((await calendar(admin.auth)).dishes).toHaveLength(1);
    const seen = await calendar(member.auth);
    expect(seen.dishes).toEqual([]);
    expect(seen.days).toMatchObject([{ date: TOMORROW, status: 'draft' }]);
  });

  it('copies a recipe’s details, so the dish outlives it', async () => {
    const recipe = await createCatalogRecipe('Chicken Bowl');
    const res = await add(admin.auth, { recipeId: recipe.id });
    expect(res.body).toMatchObject({ name: 'Chicken Bowl', prepMinutes: 15, cookMinutes: 20 });

    await prisma.recipe.delete({ where: { id: recipe.id } });

    const stored = await prisma.plannedDish.findFirstOrThrow();
    expect(stored).toMatchObject({ recipeId: null, ingredients: ['600g Chicken breast', 'Quinoa'], steps: ['Cook everything.'] });
  });

  it('adds from a saved link, but not someone else’s or one still loading', async () => {
    const saved = await prisma.bookmark.create({
      data: { userId: admin.id, source: 'instagram', title: 'Fajita Bowls', url: 'https://x.test/1', thumbnailUrl: '', author: '@c', ingredients: ['rice'] },
    });
    const loading = await prisma.bookmark.create({
      data: { userId: admin.id, source: 'instagram', title: 'Soon', thumbnailUrl: '', author: '@c', ingredients: [], awaitingContent: true },
    });
    const theirs = await prisma.bookmark.create({
      data: { userId: member.id, source: 'instagram', title: 'Theirs', thumbnailUrl: '', author: '@c', ingredients: [] },
    });

    expect((await add(admin.auth, { bookmarkId: saved.id })).body).toMatchObject({ name: 'Fajita Bowls' });
    expect((await add(admin.auth, { bookmarkId: loading.id })).status).toBe(409);
    expect((await add(admin.auth, { bookmarkId: theirs.id })).status).toBe(404);
  });

  it('won’t take the same dish twice, or a dish from nowhere', async () => {
    await add(admin.auth, { name: 'Chicken Curry' });
    expect((await add(admin.auth, { name: 'chicken curry' })).status).toBe(409);
    expect((await add(admin.auth, {})).status).toBe(400);
    expect((await add(admin.auth, { name: 'Two', recipeId: '6f1c2a8e-1111-4c4c-9c9c-123456789abc' })).status).toBe(400);
  });

  it('refuses days that have passed', async () => {
    expect((await add(admin.auth, { date: key(-3), name: 'Old' })).status).toBe(409);
  });
});

describe('starting the timer', () => {
  it('is for the admin only, and needs a dish', async () => {
    await add(admin.auth, { name: 'Chicken Curry' });
    expect((await startTimer(member.auth)).status).toBe(403);
    expect((await startTimer(admin.auth, [NEXT_DAY])).status).toBe(409);
  });

  it('checks the length', async () => {
    await add(admin.auth, { name: 'Chicken Curry' });
    expect((await startTimer(admin.auth, [TOMORROW], 1)).status).toBe(400);
    expect((await startTimer(admin.auth, [TOMORROW], 99999)).status).toBe(400);
  });

  it('opens the day to everyone, with one deadline for a whole week', async () => {
    await add(admin.auth, { name: 'Chicken Curry' });
    await add(admin.auth, { date: NEXT_DAY, name: 'Dal' });

    const res = await startTimer(admin.auth, [TOMORROW, NEXT_DAY], 120);

    const seen = await calendar(member.auth);
    expect(res.status).toBe(200);
    expect(seen.dishes).toHaveLength(2);
    expect(seen.days.map((day: { status: string }) => day.status)).toEqual(['open', 'open']);
    expect(seen.days[0].votingEndsAt).toBe(res.body.votingEndsAt);
    expect(new Date(seen.days[0].votingEndsAt).getTime()).toBeGreaterThan(Date.now() + 119 * 60_000);
  });
});

describe('members answer', () => {
  it('can’t answer before the timer starts', async () => {
    const dish = await add(admin.auth, { name: 'Chicken Curry' });
    expect((await accept(member.auth, dish.body.id)).status).toBe(409);
  });

  it('accepts a dish, and can change their mind', async () => {
    const curry = await openDay();
    const dal = await add(admin.auth, { name: 'Dal' });

    const res = await accept(member.auth, curry);
    expect(res.body.memberIds).toEqual([member.id]);

    // One choice per meal: accepting the other dish moves them
    await accept(member.auth, dal.body.id);
    const { dishes } = await calendar(member.auth);
    expect(dishes.find((d: { id: string }) => d.id === curry).memberIds).toEqual([]);
    expect(dishes.find((d: { id: string }) => d.id === dal.body.id).memberIds).toEqual([member.id]);

    await api().delete(`/calendar/dishes/${dal.body.id}/accept`).set('Authorization', member.auth);
    expect(await prisma.mealResponse.count()).toBe(0);
  });

  it('can’t change the plan', async () => {
    const curry = await openDay();
    expect((await api().delete(`/calendar/dishes/${curry}`).set('Authorization', member.auth)).status).toBe(403);
    expect((await api().post(`/calendar/days/${TOMORROW}/fix`).set('Authorization', member.auth)).status).toBe(403);
    expect((await decide(member.auth, curry, true)).status).toBe(403);
  });

  it('survives two taps at once', async () => {
    const curry = await openDay();
    const results = await Promise.all([accept(member.auth, curry), accept(member.auth, curry)]);
    expect(results.every((res) => res.status === 200)).toBe(true);
    expect(await prisma.mealResponse.count()).toBe(1);
  });
});

describe('picking meals ahead of the timer', () => {
  it('lets a member pick on a day nobody has planned, shown only to them and the admin', async () => {
    const { other } = await createThirdMember();
    const pick = await add(member.auth, { name: 'Pizza' });

    expect(pick.status).toBe(201);
    expect(pick.body).toMatchObject({ status: 'pending', isSuggestion: true });
    const names = async (auth: string) => (await calendar(auth)).dishes.map((d: { name: string }) => d.name);
    expect(await names(member.auth)).toEqual(['Pizza']);
    expect(await names(admin.auth)).toEqual(['Pizza']);
    expect(await names(other.auth)).toEqual([]);
  });

  it('keeps the admin\u2019s draft hidden while showing a member their own pick', async () => {
    await add(admin.auth, { name: 'Chicken Curry' });
    await add(member.auth, { name: 'Pizza' });

    const names = (await calendar(member.auth)).dishes.map((d: { name: string }) => d.name);
    expect(names).toEqual(['Pizza']);
  });

  it('lets the admin decide a pick before any timer, and the member still sees it', async () => {
    const pick = await add(member.auth, { name: 'Pizza' });

    const decided = await decide(admin.auth, pick.body.id, true);
    expect(decided.status).toBe(200);
    expect(decided.body.memberIds).toEqual([member.id]);
    const [seen] = (await calendar(member.auth)).dishes;
    expect(seen).toMatchObject({ name: 'Pizza', status: 'approved' });
  });

  it('turns a pick away once the day is fixed', async () => {
    await add(admin.auth, { name: 'Chicken Curry' });
    await api().post(`/calendar/days/${TOMORROW}/fix`).set('Authorization', admin.auth);

    const late = await add(member.auth, { name: 'Pizza' });
    expect(late.status).toBe(409);
    expect(late.body.detail).toMatch(/fixed/);
  });

  it('tells a member someone else got there first, without saying who', async () => {
    const { other } = await createThirdMember();
    await add(member.auth, { name: 'Pizza' });

    const second = await add(other.auth, { name: 'pizza' });
    expect(second.status).toBe(409);
    expect(second.body.detail).toBe('Someone has already suggested this');
  });
});

describe('suggestions', () => {
  async function suggest(name = 'Pizza') {
    await openDay();
    return (await add(member.auth, { name })).body;
  }

  it('waits for the admin, and nobody can pick it yet', async () => {
    const pizza = await suggest();

    expect(pizza).toMatchObject({ isSuggestion: true, status: 'pending', addedById: member.id });
    expect((await accept(member.auth, pizza.id)).status).toBe(409);
    expect((await calendar(admin.auth)).dishes.map((d: { name: string }) => d.name)).toContain('Pizza');
  });

  it('on approval joins the plan, with the suggester counted in', async () => {
    const pizza = await suggest();

    const res = await decide(admin.auth, pizza.id, true);

    expect(res.body).toMatchObject({ status: 'approved', memberIds: [member.id] });
    expect((await accept(admin.auth, pizza.id)).status).toBe(200);
  });

  it('when declined shows only to the person who suggested it', async () => {
    const pizza = await suggest();
    await decide(admin.auth, pizza.id, false);

    const third = await createUser();
    const { inviteCode } = await prisma.household.findFirstOrThrow();
    await api().post('/household/join').set('Authorization', third.auth).send({ code: inviteCode });

    expect((await calendar(member.auth)).dishes.map((d: { status: string }) => d.status)).toContain('declined');
    expect((await calendar(third.auth)).dishes.map((d: { name: string }) => d.name)).toEqual(['Chicken Curry']);
  });

  it('can be withdrawn by its owner, not by another member', async () => {
    const pizza = await suggest();
    const third = await createUser();
    const { inviteCode } = await prisma.household.findFirstOrThrow();
    await api().post('/household/join').set('Authorization', third.auth).send({ code: inviteCode });

    expect((await api().delete(`/calendar/dishes/${pizza.id}`).set('Authorization', third.auth)).status).toBe(403);
    expect((await api().delete(`/calendar/dishes/${pizza.id}`).set('Authorization', member.auth)).status).toBe(204);
  });

  it('can only be decided once', async () => {
    const pizza = await suggest();
    await decide(admin.auth, pizza.id, true);
    expect((await decide(admin.auth, pizza.id, false)).status).toBe(409);
  });
});

describe('when the timer ends', () => {
  it('fixes the day and turns away late answers, with no job running', async () => {
    const curry = await openDay();
    await expireTimer();

    const late = await accept(member.auth, curry);

    expect(late.status).toBe(409);
    expect(late.body.detail).toMatch(/fixed/);
    expect((await calendar(member.auth)).days[0]).toMatchObject({ status: 'fixed' });
    expect((await add(member.auth, { name: 'Pizza' })).status).toBe(409);
    expect((await add(admin.auth, { name: 'Dal' })).status).toBe(409);
  });

  it('gives people who didn’t answer the most chosen dish, so the cook counts them', async () => {
    const curry = await openDay();
    const dal = await add(admin.auth, { name: 'Dal' });
    await accept(admin.auth, dal.body.id);
    await expireTimer();
    await calendar(admin.auth);

    const responses = await prisma.mealResponse.findMany();
    expect(responses).toHaveLength(2);
    expect(responses.find((r) => r.userId === member.id)).toMatchObject({ dishId: dal.body.id, isDefault: true });
    expect(responses.find((r) => r.userId === admin.id)).toMatchObject({ isDefault: false });
    expect(curry).toBeTruthy();
  });

  it('settles ties on the dish added first', async () => {
    const curry = await openDay();
    await add(admin.auth, { name: 'Dal' });
    await expireTimer();
    await calendar(admin.auth);

    const responses = await prisma.mealResponse.findMany();
    expect(responses.map((r) => r.dishId)).toEqual([curry, curry]);
  });

  it('declines suggestions nobody decided on', async () => {
    await openDay();
    const pizza = await add(member.auth, { name: 'Pizza' });
    await expireTimer();
    await calendar(admin.auth);

    expect(await prisma.plannedDish.findUniqueOrThrow({ where: { id: pizza.body.id } })).toMatchObject({ status: 'declined' });
  });

  it('only settles a day once, however many requests arrive together', async () => {
    await openDay();
    await expireTimer();

    await Promise.all([calendar(admin.auth), calendar(member.auth), calendar(admin.auth)]);

    expect(await prisma.mealResponse.count()).toBe(2);
  });

  it('can be ended early by the admin', async () => {
    await openDay();
    expect((await api().post(`/calendar/days/${TOMORROW}/fix`).set('Authorization', admin.auth)).status).toBe(204);
    expect((await calendar(member.auth)).days[0].status).toBe('fixed');
  });

  it('can be reopened, clearing answers that were only filled in', async () => {
    const curry = await openDay();
    await accept(admin.auth, curry);
    await expireTimer();
    await calendar(admin.auth);
    expect(await prisma.mealResponse.count()).toBe(2);

    await startTimer();

    const left = await prisma.mealResponse.findMany();
    expect(left.map((r) => r.userId)).toEqual([admin.id]);
    expect((await calendar(member.auth)).days[0].status).toBe('open');
  });
});

describe('dishes to choose from', () => {
  const options = async (auth: string, meal = 'dinner') =>
    (await api().get(`/calendar/dish-options?meal=${meal}`).set('Authorization', auth)).body;

  it('lists recently saved, liked and suggested dishes for the meal', async () => {
    const liked = await createCatalogRecipe('Liked Bowl');
    await createCatalogRecipe('Other Bowl');
    await api().put(`/recipes/${liked.id}/bookmark`).set('Authorization', admin.auth);
    await prisma.bookmark.create({
      data: { userId: admin.id, source: 'youtube', title: 'Saved Stew', thumbnailUrl: '', author: 'c', ingredients: [], category: 'lunch_dinner' },
    });
    await prisma.bookmark.create({
      data: { userId: admin.id, source: 'youtube', title: 'Pancakes', thumbnailUrl: '', author: 'c', ingredients: [], category: 'breakfast' },
    });
    await prisma.bookmark.create({
      data: { userId: admin.id, source: 'instagram', title: 'Still Loading', thumbnailUrl: '', author: 'c', ingredients: [], awaitingContent: true },
    });

    const result = await options(admin.auth);

    expect(result.recentlySaved.map((o: { name: string }) => o.name)).toEqual(['Saved Stew']);
    expect(result.liked.map((o: { name: string }) => o.name)).toEqual(['Liked Bowl']);
    expect(result.suggested.map((o: { name: string }) => o.name)).toEqual(['Other Bowl']);
  });

  it('suggests what the household already ate, first', async () => {
    await createCatalogRecipe('Catalog Bowl');
    const curry = await openDay();
    await accept(member.auth, curry);

    const result = await options(member.auth);

    expect(result.suggested[0]).toMatchObject({ name: 'Chicken Curry', fromDishId: curry, reason: 'Your household had this' });
    expect((await add(admin.auth, { date: NEXT_DAY, fromDishId: curry })).body).toMatchObject({ name: 'Chicken Curry' });
  });

  it('never shows another member’s saved links', async () => {
    await prisma.bookmark.create({
      data: { userId: admin.id, source: 'youtube', title: 'Private Save', thumbnailUrl: '', author: 'c', ingredients: [] },
    });
    expect((await options(member.auth)).recentlySaved).toEqual([]);
  });
});

describe('when someone leaves', () => {
  it('drops their upcoming answers', async () => {
    const curry = await openDay();
    await accept(member.auth, curry);

    await api().post('/household/leave').set('Authorization', member.auth);

    expect(await prisma.mealResponse.count()).toBe(0);
    expect(await prisma.plannedDish.count()).toBe(1);
  });
});

describe('fixing a day without a timer', () => {
  it('lets the admin fix a planned day, counting everyone in', async () => {
    const dish = await add(admin.auth, { name: 'Chicken Curry' });
    expect((await api().post(`/calendar/days/${TOMORROW}/fix`).set('Authorization', admin.auth)).status).toBe(204);

    const { days, dishes } = await calendar(member.auth);
    expect(days[0].status).toBe('fixed');
    expect(dishes.find(({ id }: { id: string }) => id === dish.body.id).memberIds).toHaveLength(2);
  });

  it('needs a dish on the day', async () => {
    const res = await api().post(`/calendar/days/${TOMORROW}/fix`).set('Authorization', admin.auth);
    expect(res.status).toBe(409);
    expect(res.body.detail).toMatch(/Add a dish/);
  });

  it('turns away a day that is already fixed', async () => {
    await add(admin.auth, { name: 'Chicken Curry' });
    await api().post(`/calendar/days/${TOMORROW}/fix`).set('Authorization', admin.auth);
    const again = await api().post(`/calendar/days/${TOMORROW}/fix`).set('Authorization', admin.auth);
    expect(again.status).toBe(409);
  });
});
