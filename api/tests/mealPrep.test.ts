import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { api, createCatalogRecipe, createHousehold, createUser, prisma, resetDatabase } from './helpers.js';

const key = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const WEEK_START = key(0);
const DAY = key(1);

let admin: Awaited<ReturnType<typeof createUser>>;
let member: Awaited<ReturnType<typeof createUser>>;

beforeEach(async () => {
  await resetDatabase();
  ({ admin, member } = await createHousehold());
});
afterAll(() => prisma.$disconnect());

const add = async (body: object, date = DAY, meal = 'dinner') =>
  (await api().post('/calendar/dishes').set('Authorization', admin.auth).send({ date, meal, ...body })).body;
const timer = (dates = [DAY]) =>
  api().post('/calendar/timer').set('Authorization', admin.auth).send({ dates, durationMinutes: 60 });
const accept = (auth: string, id: string) => api().post(`/calendar/dishes/${id}/accept`).set('Authorization', auth);
const fix = (date = DAY) => api().post(`/calendar/days/${date}/fix`).set('Authorization', admin.auth);
const prep = async (auth = member.auth, weekStart = WEEK_START) =>
  (await api().get(`/meal-prep?weekStart=${weekStart}`).set('Authorization', auth)).body;

describe('GET /meal-prep', () => {
  it('needs a household', async () => {
    const loner = await createUser();
    expect((await api().get(`/meal-prep?weekStart=${WEEK_START}`).set('Authorization', loner.auth)).status).toBe(409);
  });

  it('only includes days that are fixed, and says what’s undecided', async () => {
    await add({ name: 'Chicken Curry' });
    await timer();

    const open = await prep();
    expect(open.dishes).toEqual([]);
    expect(open.undecidedDayCount).toBe(1);

    await fix();
    const fixed = await prep();
    expect(fixed.dishes).toHaveLength(1);
    expect(fixed).toMatchObject({ fixedDayCount: 1, undecidedDayCount: 0 });
  });

  it('counts a serving for each person eating', async () => {
    const curry = await add({ name: 'Chicken Curry' });
    const dal = await add({ name: 'Dal' });
    await timer();
    await accept(admin.auth, curry.id);
    await accept(member.auth, curry.id);
    await fix();

    const { dishes } = await prep();

    // Nobody chose the dal, so it isn't cooked
    expect(dishes.map((dish: { id: string }) => dish.id)).toEqual([curry.id]);
    expect(dishes[0]).toMatchObject({ servings: 2, memberIds: expect.arrayContaining([admin.id, member.id]) });
    expect(dal.id).toBeTruthy();
  });

  it('picks up an expired timer without anyone opening the calendar', async () => {
    await add({ name: 'Chicken Curry' });
    await timer();
    await prisma.mealDay.updateMany({ data: { votingEndsAt: new Date(Date.now() - 1000) } });

    expect((await prep()).dishes).toMatchObject([{ name: 'Chicken Curry', servings: 2 }]);
  });

  it('leaves out other weeks', async () => {
    await add({ name: 'Chicken Curry' }, key(9));
    await timer([key(9)]);
    await fix(key(9));

    expect((await prep()).dishes).toEqual([]);
    expect((await prep(member.auth, key(7))).dishes).toHaveLength(1);
  });

  it('keeps households apart', async () => {
    await add({ name: 'Chicken Curry' });
    await timer();
    await fix();
    const outsider = await createUser();
    await api().post('/household').set('Authorization', outsider.auth).send({ name: 'Other' });

    expect((await prep(outsider.auth)).dishes).toEqual([]);
  });
});

describe('shopping list', () => {
  it('merges identical lines across dishes and keeps ticks for everyone', async () => {
    const recipe = await createCatalogRecipe('Chicken Bowl');
    await add({ recipeId: recipe.id });
    await add({ recipeId: recipe.id }, DAY, 'lunch');
    await timer();
    await fix();

    const { shopping } = await prep();

    expect(shopping.map((item: { name: string }) => item.name)).toEqual(['600g Chicken breast', 'Quinoa']);
    expect(shopping[0].dishes).toHaveLength(2);

    const res = await api()
      .put('/meal-prep/shopping')
      .set('Authorization', member.auth)
      .send({ weekStart: WEEK_START, key: shopping[1].key, checked: true });
    expect(res.status).toBe(204);

    expect((await prep(admin.auth)).shopping.map((item: { checked: boolean }) => item.checked)).toEqual([false, true]);

    await api()
      .put('/meal-prep/shopping')
      .set('Authorization', admin.auth)
      .send({ weekStart: WEEK_START, key: shopping[1].key, checked: false });
    expect((await prep()).shopping[1].checked).toBe(false);
  });

  it('is fine ticking the same line twice', async () => {
    const send = () =>
      api().put('/meal-prep/shopping').set('Authorization', admin.auth).send({ weekStart: WEEK_START, key: 'rice', checked: true });
    expect((await send()).status).toBe(204);
    expect((await send()).status).toBe(204);
  });
});

describe('prep tasks', () => {
  async function fixedDish() {
    const dish = await add({ name: 'Chicken Curry' });
    await timer();
    await fix();
    return dish.id as string;
  }
  const update = (id: string, body: object, auth = member.auth) =>
    api().patch(`/meal-prep/dishes/${id}`).set('Authorization', auth).send(body);

  it('lets anyone in the household claim and finish a dish', async () => {
    const id = await fixedDish();

    expect((await update(id, { assigneeId: member.id, prepStatus: 'in_progress' })).status).toBe(204);
    expect((await prep(admin.auth)).dishes[0]).toMatchObject({ assigneeId: member.id, prepStatus: 'in_progress' });

    await update(id, { prepStatus: 'done', assigneeId: null });
    const dish = (await prep()).dishes[0];
    expect(dish.prepStatus).toBe('done');
    expect(dish.assigneeId).toBeUndefined();
  });

  it('won’t assign someone from outside the household', async () => {
    const id = await fixedDish();
    const outsider = await createUser();
    expect((await update(id, { assigneeId: outsider.id })).status).toBe(404);
  });

  it('won’t touch a day that isn’t fixed, or another household’s dish', async () => {
    const dish = await add({ name: 'Dal' });
    await timer();
    expect((await update(dish.id, { prepStatus: 'done' })).status).toBe(409);

    const outsider = await createUser();
    await api().post('/household').set('Authorization', outsider.auth).send({ name: 'Other' });
    expect((await update(dish.id, { prepStatus: 'done' }, outsider.auth)).status).toBe(404);
  });

  it('needs something to change', async () => {
    const id = await fixedDish();
    expect((await update(id, {})).status).toBe(400);
  });

  it('frees up a dish when its cook leaves', async () => {
    const id = await fixedDish();
    await update(id, { assigneeId: member.id });

    await api().post('/household/leave').set('Authorization', member.auth);

    expect((await prep(admin.auth)).dishes[0].assigneeId).toBeUndefined();
  });
});

describe('profile stats', () => {
  it('counts meals the person is on', async () => {
    await add({ name: 'Chicken Curry' });
    await timer();
    await fix();
    const profile = await api().get('/profile').set('Authorization', member.auth);
    expect(profile.body.stats.mealsPlanned).toBe(1);
  });
});
