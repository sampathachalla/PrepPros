import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { removeDemoHousehold, seedDemoHousehold } from '../scripts/demoHouseholdSeed.js';
import { api, createHousehold, createUser, prisma, resetDatabase } from './helpers.js';

const key = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

let user: Awaited<ReturnType<typeof createUser>>;
const emailOf = async (id: string) => (await prisma.user.findUniqueOrThrow({ where: { id } })).email;
const calendar = async () =>
  (await api().get(`/calendar?from=${key(-1)}&to=${key(1)}`).set('Authorization', user.auth)).body;

beforeEach(async () => {
  await resetDatabase();
  user = await createUser();
});
afterAll(() => prisma.$disconnect());

describe('demo household', () => {
  it('gives the admin a fixed, an open and a draft day', async () => {
    await seedDemoHousehold(prisma, await emailOf(user.id), 'admin');

    const { days, dishes } = await calendar();
    expect(days.map((day: { status: string }) => day.status)).toEqual(['fixed', 'open', 'draft']);
    expect(dishes.filter((dish: { status: string }) => dish.status === 'pending')).toHaveLength(2);

    const household = (await api().get('/household').set('Authorization', user.auth)).body.household;
    expect(household.members).toHaveLength(4);
  });

  it('works through the real API: accept, then decide a suggestion', async () => {
    await seedDemoHousehold(prisma, await emailOf(user.id), 'admin');
    const { dishes } = await calendar();
    const onPlan = dishes.find((dish: { name: string }) => dish.name === 'Dal Tadka');
    const suggestion = dishes.find((dish: { name: string }) => dish.name === 'Paneer Wrap');

    const accepted = await api().post(`/calendar/dishes/${onPlan.id}/accept`).set('Authorization', user.auth);
    expect(accepted.status).toBeLessThan(300);
    const decided = await api()
      .post(`/calendar/dishes/${suggestion.id}/decision`)
      .set('Authorization', user.auth)
      .send({ approve: true });
    expect(decided.status).toBeLessThan(300);
  });

  it('can make the person a member, who sees no draft dishes and can suggest', async () => {
    await seedDemoHousehold(prisma, await emailOf(user.id), 'member');

    const names = (await calendar()).dishes.map((dish: { name: string }) => dish.name);
    expect(names).toContain('Dal Tadka');
    expect(names).not.toContain('Butter Chicken');
    const suggested = await api()
      .post('/calendar/dishes')
      .set('Authorization', user.auth)
      .send({ date: key(0), meal: 'snacks', name: 'Roasted Makhana' });
    expect(suggested.body.status).toBe('pending');
  });

  it('can be run twice, and removed completely', async () => {
    const email = await emailOf(user.id);
    await seedDemoHousehold(prisma, email, 'admin');
    await seedDemoHousehold(prisma, email, 'member');
    await removeDemoHousehold(prisma);

    expect(await prisma.household.count()).toBe(0);
    expect(await prisma.user.count({ where: { email: { endsWith: '@demo.preppros.test' } } })).toBe(0);
    expect(await prisma.user.count({ where: { id: user.id } })).toBe(1);
  });

  it('leaves a real household alone', async () => {
    const { admin } = await createHousehold();
    await expect(seedDemoHousehold(prisma, await emailOf(admin.id), 'admin')).rejects.toThrow(/already in/);
    expect(await prisma.household.count()).toBe(1);
  });

  it('explains an email it does not know', async () => {
    await expect(seedDemoHousehold(prisma, 'nobody@example.com', 'admin')).rejects.toThrow(/Sign up/);
  });
});
