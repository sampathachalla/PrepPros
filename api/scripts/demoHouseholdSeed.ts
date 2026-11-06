import type { MealDayStatus, MealType, PrismaClient } from '../src/generated/prisma/client.js';
import { addDays, fromDbDate, toDbDate } from '../src/utils/dates.js';

export type DemoRole = 'admin' | 'member';

const DEMO_INVITE_CODE = 'DEMODEMO';
const DEMO_EMAIL_DOMAIN = '@demo.preppros.test';
const VOTING_HOURS = 24;
/** Marks what this script planned, so removing it never touches anyone's real dishes. */
const DEMO_NOTE = 'Demo dish';
const MAX_HOUSEHOLD_MEMBERS = 6;

const DEMO_PEOPLE = [
  { key: 'priya', displayName: 'Priya', avatarColor: '#F5AFC4' },
  { key: 'ravi', displayName: 'Ravi', avatarColor: '#A8DDF5' },
  { key: 'anu', displayName: 'Anu', avatarColor: '#B9E8C8' },
] as const;

type DemoKey = (typeof DEMO_PEOPLE)[number]['key'];

interface DemoDish {
  meal: MealType;
  name: string;
  /** Who has chosen it already. */
  chosenBy?: DemoKey[];
  /** Waiting for the admin, suggested by this person. */
  suggestedBy?: DemoKey;
}

const OPEN_DAY: DemoDish[] = [
  { meal: 'breakfast', name: 'Masala Oats', chosenBy: ['priya'] },
  { meal: 'breakfast', name: 'Idli & Sambar', chosenBy: ['ravi'] },
  { meal: 'lunch', name: 'Chicken Curry & Rice', chosenBy: ['priya', 'anu'] },
  { meal: 'lunch', name: 'Dal Tadka' },
  { meal: 'lunch', name: 'Paneer Wrap', suggestedBy: 'ravi' },
  { meal: 'snacks', name: 'Fruit & Yogurt Bowl' },
  { meal: 'dinner', name: 'Vegetable Biryani', chosenBy: ['anu'] },
  { meal: 'dinner', name: 'Grilled Fish & Salad' },
  { meal: 'dinner', name: 'Lemon Rice', suggestedBy: 'anu' },
];

const DRAFT_DAY: DemoDish[] = [
  { meal: 'breakfast', name: 'Poha' },
  { meal: 'dinner', name: 'Butter Chicken' },
];

const FIXED_DAY: DemoDish[] = [
  { meal: 'breakfast', name: 'Upma', chosenBy: ['priya', 'ravi', 'anu'] },
  { meal: 'lunch', name: 'Rajma Chawal', chosenBy: ['priya', 'ravi'] },
  { meal: 'dinner', name: 'Egg Fried Rice', chosenBy: ['priya', 'ravi', 'anu'] },
];

/** What people have picked for next week, before the admin has planned anything. */
const NEXT_WEEK_PICKS: { dayOfWeek: number; dishes: DemoDish[] }[] = [
  {
    dayOfWeek: 1,
    dishes: [
      { meal: 'lunch', name: 'Chole Bhature', suggestedBy: 'ravi' },
      { meal: 'dinner', name: 'Palak Paneer', suggestedBy: 'priya' },
    ],
  },
  { dayOfWeek: 3, dishes: [{ meal: 'breakfast', name: 'Dosa', suggestedBy: 'anu' }] },
  { dayOfWeek: 5, dishes: [{ meal: 'dinner', name: 'Hakka Noodles', suggestedBy: 'ravi' }] },
];

const demoEmail = (key: DemoKey) => `${key}${DEMO_EMAIL_DOMAIN}`;

/** Removes everything this script added: its household, its people, and any dishes it planned elsewhere. */
export async function removeDemoHousehold(prisma: PrismaClient) {
  const dishes = await prisma.plannedDish.findMany({
    where: { notes: DEMO_NOTE },
    select: { householdId: true, date: true },
  });
  await prisma.plannedDish.deleteMany({ where: { notes: DEMO_NOTE } });

  // A day left with nothing on it goes too, so a real household gets back to where it was
  for (const { householdId, date } of dishes) {
    const remaining = await prisma.plannedDish.count({ where: { householdId, date } });
    if (remaining === 0) await prisma.mealDay.deleteMany({ where: { householdId, date } });
  }

  await prisma.household.deleteMany({ where: { inviteCode: DEMO_INVITE_CODE } });
  await prisma.user.deleteMany({ where: { email: { endsWith: DEMO_EMAIL_DOMAIN } } });
}

async function createDemoPeople(prisma: PrismaClient) {
  const people = {} as Record<DemoKey, string>;
  for (const { key, displayName, avatarColor } of DEMO_PEOPLE) {
    const person = await prisma.user.create({
      data: { email: demoEmail(key), username: `demo_${key}`, displayName, avatarColor },
    });
    people[key] = person.id;
  }
  return people;
}

/** Yesterday fixed, today with a timer running, tomorrow a draft, and picks waiting for next week. */
async function planDemoDays(
  prisma: PrismaClient,
  householdId: string,
  adminId: string,
  people: Record<DemoKey, string>,
  now: Date,
) {
  const addDay = async (date: Date, status: MealDayStatus, dishes: DemoDish[], votingEndsAt: Date | null = null) => {
    await prisma.mealDay.upsert({
      where: { householdId_date: { householdId, date } },
      create: { householdId, date, status, votingEndsAt },
      update: { status, votingEndsAt },
    });
    for (const { meal, name, chosenBy = [], suggestedBy } of dishes) {
      const dish = await prisma.plannedDish.create({
        data: {
          householdId,
          date,
          meal,
          name,
          notes: DEMO_NOTE,
          prepMinutes: 10,
          cookMinutes: 25,
          baseServings: 4,
          isSuggestion: suggestedBy !== undefined,
          status: suggestedBy ? 'pending' : 'approved',
          addedById: suggestedBy ? people[suggestedBy] : adminId,
        },
      });
      for (const key of chosenBy) {
        await prisma.mealResponse.create({
          data: { householdId, date, meal, userId: people[key], dishId: dish.id },
        });
      }
    }
  };

  const today = toDbDate(fromDbDate(now));
  await addDay(addDays(today, -1), 'fixed', FIXED_DAY);
  await addDay(today, 'open', OPEN_DAY, new Date(now.getTime() + VOTING_HOURS * 60 * 60 * 1000));
  await addDay(addDays(today, 1), 'draft', DRAFT_DAY);

  const nextSunday = addDays(today, 7 - today.getUTCDay());
  for (const { dayOfWeek, dishes } of NEXT_WEEK_PICKS) {
    await addDay(addDays(nextSunday, dayOfWeek), 'draft', dishes);
  }
  return fromDbDate(today);
}

export async function seedDemoHousehold(prisma: PrismaClient, email: string, role: DemoRole, now = new Date()) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: { membership: { include: { household: true } } },
  });
  if (!user) throw new Error(`No account with the email ${email}. Sign up in the app first.`);

  const existing = user.membership?.household;
  if (existing && existing.inviteCode !== DEMO_INVITE_CODE) {
    throw new Error(`${email} is already in "${existing.name}". Leave it in the app first; it was not changed.`);
  }

  await removeDemoHousehold(prisma);

  const people = await createDemoPeople(prisma);

  const adminId = role === 'admin' ? user.id : people.priya;
  const household = await prisma.household.create({
    data: {
      name: 'Demo Household',
      inviteCode: DEMO_INVITE_CODE,
      members: {
        create: [
          { userId: user.id, role },
          ...DEMO_PEOPLE.map(({ key }) => ({
            userId: people[key],
            role: role === 'member' && key === 'priya' ? ('admin' as const) : ('member' as const),
          })),
        ],
      },
    },
  });

  const today = await planDemoDays(prisma, household.id, adminId, people, now);
  return { householdId: household.id, today };
}

/** Adds the demo people and meals to a household someone already runs. `--remove` takes only those back out. */
export async function addDemoToMyHousehold(prisma: PrismaClient, emailOrUsername: string, now = new Date()) {
  const handle = emailOrUsername.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: handle }, { username: handle }] },
    include: { membership: { include: { household: { include: { members: true } } } } },
  });
  if (!user) throw new Error(`No account called ${emailOrUsername}. Sign up in the app first.`);
  const { membership } = user;
  if (!membership) throw new Error(`${emailOrUsername} isn't in a household yet.`);
  if (membership.role !== 'admin') throw new Error('Only the household admin can do this.');

  await removeDemoHousehold(prisma);

  const memberCount = await prisma.householdMember.count({ where: { householdId: membership.householdId } });
  if (memberCount + DEMO_PEOPLE.length > MAX_HOUSEHOLD_MEMBERS) {
    throw new Error(`${membership.household.name} has no room for ${DEMO_PEOPLE.length} more people.`);
  }

  const people = await createDemoPeople(prisma);
  await prisma.householdMember.createMany({
    data: Object.values(people).map((userId) => ({ householdId: membership.householdId, userId })),
  });
  const today = await planDemoDays(prisma, membership.householdId, user.id, people, now);
  return { name: membership.household.name, today };
}
