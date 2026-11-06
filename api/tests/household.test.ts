import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { api, createHousehold, createUser, prisma, resetDatabase } from './helpers.js';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

const get = (auth: string) => api().get('/household').set('Authorization', auth);
const create = (auth: string, name = 'Home') => api().post('/household').set('Authorization', auth).send({ name });
const join = (auth: string, code: string) => api().post('/household/join').set('Authorization', auth).send({ code });

describe('adding someone by email', () => {
  const add = (auth: string, email: string) =>
    api().post('/household/members').set('Authorization', auth).send({ email });

  it('adds an existing account as a member, whatever the capitals', async () => {
    const { admin } = await createHousehold();
    const person = await createUser({ email: 'asha@example.com', username: 'asha' });

    const res = await add(admin.auth, ' Asha@Example.COM ');

    expect(res.status).toBe(201);
    expect(res.body.household.members).toHaveLength(3);
    expect(res.body.household.members.at(-1)).toMatchObject({ id: person.id, name: 'asha', role: 'member' });
    expect((await get(person.auth)).body.household.myRole).toBe('member');
  });

  it('tells the admin when no account uses the email', async () => {
    const { admin } = await createHousehold();
    const res = await add(admin.auth, 'nobody@example.com');
    expect(res.status).toBe(404);
    expect(res.body.detail).toMatch(/invite link/);
  });

  it('is for the admin only, and never looks up the email for anyone else', async () => {
    const { member } = await createHousehold();
    await createUser({ email: 'asha@example.com' });
    expect((await add(member.auth, 'asha@example.com')).status).toBe(403);
    expect((await add(member.auth, 'nobody@example.com')).status).toBe(403);
  });

  it('needs a household of your own', async () => {
    const { auth } = await createUser();
    await createUser({ email: 'asha@example.com' });
    expect((await add(auth, 'asha@example.com')).status).toBe(409);
  });

  it('refuses someone already in a household', async () => {
    const { admin } = await createHousehold();
    const person = await createUser({ email: 'asha@example.com' });
    await create(person.auth);
    const res = await add(admin.auth, 'asha@example.com');
    expect(res.status).toBe(409);
    expect(res.body.detail).toMatch(/another household/);
  });

  it('refuses someone already in this household', async () => {
    const { admin } = await createHousehold();
    await createUser({ email: 'asha@example.com' });
    await add(admin.auth, 'asha@example.com');
    const res = await add(admin.auth, 'asha@example.com');
    expect(res.status).toBe(409);
    expect(res.body.detail).toMatch(/your household/);
  });

  it('stops at the household limit before looking anyone up', async () => {
    const { admin } = await createHousehold();
    for (let index = 0; index < 4; index += 1) {
      await createUser({ email: `person${index}@example.com` });
      await add(admin.auth, `person${index}@example.com`);
    }
    await createUser({ email: 'extra@example.com' });
    const res = await add(admin.auth, 'extra@example.com');
    expect(res.status).toBe(409);
    expect(res.body.detail).toMatch(/full/);
    expect((await add(admin.auth, 'nobody@example.com')).body.detail).toMatch(/full/);
  });

  it('rejects something that is not an email', async () => {
    const { admin } = await createHousehold();
    expect((await add(admin.auth, 'not-an-email')).status).toBe(400);
  });

  it('limits how many emails can be tried', async () => {
    const { admin } = await createHousehold();
    for (let attempt = 0; attempt < 20; attempt += 1) await add(admin.auth, `try${attempt}@example.com`);
    expect((await add(admin.auth, 'one-more@example.com')).status).toBe(429);
  });
});

describe('creating a household', () => {
  it('needs a login', async () => {
    expect((await api().get('/household')).status).toBe(401);
  });

  it('starts with nothing', async () => {
    const { auth } = await createUser();
    expect((await get(auth)).body).toEqual({ household: null });
  });

  it('makes the creator the admin and gives an invite link', async () => {
    const { auth, id } = await createUser({ username: 'priya' });

    const res = await create(auth, 'The Achallas');

    expect(res.status).toBe(201);
    expect(res.body.household).toMatchObject({
      name: 'The Achallas',
      myRole: 'admin',
      inviteCode: expect.stringMatching(/^[A-Z2-9]{8}$/),
      members: [{ id, name: 'priya', initials: 'PR', role: 'admin', color: expect.stringMatching(/^#/) }],
    });
    expect(res.body.household.inviteLink).toBe(`preppros://join/${res.body.household.inviteCode}`);
  });

  it('keeps a person to one household, even on a double tap', async () => {
    const { auth } = await createUser();
    const results = await Promise.all([create(auth), create(auth)]);

    expect(results.map((res) => res.status).sort()).toEqual([201, 409]);
    expect(await prisma.household.count()).toBe(1);
  });
});

describe('joining a household', () => {
  it('makes you a member, from a code or a whole link', async () => {
    const { inviteCode } = await createHousehold();
    const viaCode = await createUser();
    const viaLink = await createUser();
    const viaQuery = await createUser();

    const first = await join(viaCode.auth, inviteCode.toLowerCase());
    await join(viaLink.auth, `preppros://join/${inviteCode}`);
    await join(viaQuery.auth, `https://preppros.app/join?code=${inviteCode}`);

    expect(first.status).toBe(200);
    expect(first.body.household).toMatchObject({ myRole: 'member' });
    expect((await get(viaQuery.auth)).body.household.members).toHaveLength(5);
  });

  it('rejects a bad code and a second household', async () => {
    const { member } = await createHousehold();
    const stranger = await createUser();
    const other = await createUser();
    const { body } = await create(other.auth, 'Other');

    expect((await join(stranger.auth, 'NOTACODE')).status).toBe(404);
    expect((await join(member.auth, body.household.inviteCode)).status).toBe(409);
  });

  it('stops at six people', async () => {
    const { inviteCode } = await createHousehold();
    for (let i = 0; i < 4; i++) await join((await createUser()).auth, inviteCode);

    const res = await join((await createUser()).auth, inviteCode);

    expect(res.status).toBe(409);
    expect(res.body.detail).toMatch(/full/);
  });

  it('limits guessing', async () => {
    const { auth } = await createUser();
    for (let i = 0; i < 10; i++) await join(auth, `GUESS00${i}`);
    expect((await join(auth, 'GUESS010')).status).toBe(429);
  });
});

describe('admin powers', () => {
  it('only the admin can rename, reset the invite, or remove people', async () => {
    const { member, admin } = await createHousehold();
    expect((await api().patch('/household').set('Authorization', member.auth).send({ name: 'Mine' })).status).toBe(403);
    expect((await api().post('/household/invite/reset').set('Authorization', member.auth)).status).toBe(403);
    expect((await api().delete(`/household/members/${admin.id}`).set('Authorization', member.auth)).status).toBe(403);
    expect((await api().post(`/household/members/${member.id}/admin`).set('Authorization', member.auth)).status).toBe(403);
  });

  it('resetting the invite kills old links', async () => {
    const { admin, inviteCode } = await createHousehold();
    const res = await api().post('/household/invite/reset').set('Authorization', admin.auth);

    expect(res.body.household.inviteCode).not.toBe(inviteCode);
    expect((await join((await createUser()).auth, inviteCode)).status).toBe(404);
  });

  it('cannot touch someone in another household', async () => {
    const { admin } = await createHousehold();
    const outsider = await createUser();
    await create(outsider.auth, 'Other');

    expect((await api().delete(`/household/members/${outsider.id}`).set('Authorization', admin.auth)).status).toBe(404);
    expect((await api().post(`/household/members/${outsider.id}/admin`).set('Authorization', admin.auth)).status).toBe(404);
  });

  it('hands the admin role over', async () => {
    const { admin, member } = await createHousehold();
    await api().post(`/household/members/${member.id}/admin`).set('Authorization', admin.auth);

    expect((await get(admin.auth)).body.household.myRole).toBe('member');
    expect((await get(member.auth)).body.household.myRole).toBe('admin');
  });
});

describe('leaving', () => {
  it('lets a member go', async () => {
    const { member, admin } = await createHousehold();
    expect((await api().post('/household/leave').set('Authorization', member.auth)).status).toBe(204);
    expect((await get(member.auth)).body).toEqual({ household: null });
    expect((await get(admin.auth)).body.household.members).toHaveLength(1);
  });

  it('makes an admin hand over first', async () => {
    const { admin } = await createHousehold();
    const res = await api().post('/household/leave').set('Authorization', admin.auth);
    expect(res.status).toBe(409);
    expect(res.body.detail).toMatch(/admin/);
  });

  it('closes the household when the last person leaves', async () => {
    const { auth } = await createUser();
    await create(auth);
    await api().post('/household/leave').set('Authorization', auth);
    expect(await prisma.household.count()).toBe(0);
  });
});

describe('profile', () => {
  it('shows the name and avatar colour people chose', async () => {
    const { auth, id } = await createUser({ username: 'priya' });
    await create(auth);

    const res = await api()
      .patch('/profile')
      .set('Authorization', auth)
      .send({ displayName: 'Priya Achalla', avatarColor: '#123ABC' });

    expect(res.body).toMatchObject({ displayName: 'Priya Achalla', avatarColor: '#123ABC' });
    expect((await get(auth)).body.household.members[0]).toMatchObject({
      id,
      name: 'Priya Achalla',
      initials: 'PA',
      color: '#123ABC',
    });
  });

  it('rejects a colour that isn’t one', async () => {
    const { auth } = await createUser();
    expect((await api().patch('/profile').set('Authorization', auth).send({ avatarColor: 'red' })).status).toBe(400);
  });
});
