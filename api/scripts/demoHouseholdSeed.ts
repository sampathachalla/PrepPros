import type { MealType, Prisma, PrismaClient } from '../src/generated/prisma/client.js';
import { addDays, fromDbDate, toDbDate } from '../src/utils/dates.js';

export type DemoRole = 'admin' | 'member';

const DEMO_INVITE_CODE = 'DEMODEMO';
const DEMO_EMAIL_DOMAIN = '@demo.preppros.test';
const VOTING_HOURS = 24;

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

const demoEmail = (key: DemoKey) => `${key}${DEMO_EMAIL_DOMAIN}`;

/** Removes the demo household and its people. Everything planned in it goes with it. */
export async function removeDemoHousehold(prisma: PrismaClient) {
  await prisma.household.deleteMany({ where: { inviteCode: DEMO_INVITE_CODE } });
  await prisma.user.deleteMany({ where: { email: { endsWith: DEMO_EMAIL_DOMAIN } } });
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

  const people = {} as Record<DemoKey, string>;
  for (const { key, displayName, avatarColor } of DEMO_PEOPLE) {
    const person = await prisma.user.create({
      data: { email: demoEmail(key), username: `demo_${key}`, displayName, avatarColor },
    });
    people[key] = person.id;
  }

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

  const addDay = async (date: Date, status: Prisma.MealDayCreateManyInput['status'], dishes: DemoDish[], votingEndsAt?: Date) => {
    await prisma.mealDay.create({ data: { householdId: household.id, date, status, votingEndsAt } });
    for (const { meal, name, chosenBy = [], suggestedBy } of dishes) {
      const dish = await prisma.plannedDish.create({
        data: {
          householdId: household.id,
          date,
          meal,
          name,
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
          data: { householdId: household.id, date, meal, userId: people[key], dishId: dish.id },
        });
      }
    }
  };

  const today = toDbDate(fromDbDate(now));
  await addDay(addDays(today, -1), 'fixed', FIXED_DAY);
  await addDay(today, 'open', OPEN_DAY, new Date(now.getTime() + VOTING_HOURS * 60 * 60 * 1000));
  await addDay(addDays(today, 1), 'draft', DRAFT_DAY);

  return { householdId: household.id, today: fromDbDate(today) };
}
