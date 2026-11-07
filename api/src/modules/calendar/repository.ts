import { prisma } from '../../config/db.js';
import type { MealType, Prisma } from '../../generated/prisma/client.js';

const withResponses = { responses: { select: { userId: true, isDefault: true } } } as const;

export type DishWithResponses = Prisma.PlannedDishGetPayload<{ include: typeof withResponses }>;

export function findDays(householdId: string, from: Date, to: Date) {
  return prisma.mealDay.findMany({ where: { householdId, date: { gte: from, lte: to } }, orderBy: { date: 'asc' } });
}

export function findDay(householdId: string, date: Date) {
  return prisma.mealDay.findUnique({ where: { householdId_date: { householdId, date } } });
}

export function findDishes(householdId: string, from: Date, to: Date) {
  return prisma.plannedDish.findMany({
    where: { householdId, date: { gte: from, lte: to } },
    include: withResponses,
    orderBy: { createdAt: 'asc' },
  });
}

export function findDish(householdId: string, id: string) {
  return prisma.plannedDish.findFirst({ where: { id, householdId }, include: withResponses });
}

export function findExpiredDays(householdId: string, now: Date) {
  return prisma.mealDay.findMany({ where: { householdId, status: 'open', votingEndsAt: { lte: now } } });
}

export function ensureDraftDay(householdId: string, date: Date) {
  return prisma.mealDay.upsert({
    where: { householdId_date: { householdId, date } },
    create: { householdId, date },
    update: {},
  });
}

export function createDish(data: Prisma.PlannedDishUncheckedCreateInput) {
  return prisma.plannedDish.create({ data, include: withResponses });
}

export function deleteDish(id: string) {
  return prisma.plannedDish.delete({ where: { id } });
}

/** Swaps one dish for another in one step, so a failure can't leave the meal without either. */
export function replaceDish(replacedId: string, data: Prisma.PlannedDishUncheckedCreateInput) {
  return prisma.$transaction(async (tx) => {
    await tx.plannedDish.deleteMany({ where: { id: replacedId } });
    return tx.plannedDish.create({ data, include: withResponses });
  });
}

/** The dish a person put on a meal. A declined dish doesn't count. */
export function findOwnDish(householdId: string, date: Date, meal: MealType, userId: string) {
  return prisma.plannedDish.findFirst({
    where: { householdId, date, meal, addedById: userId, status: { not: 'declined' } },
  });
}

export function findDuplicateDish(householdId: string, date: Date, meal: MealType, name: string) {
  return prisma.plannedDish.findFirst({
    where: {
      householdId,
      date,
      meal,
      name: { equals: name, mode: 'insensitive' },
      status: { not: 'declined' },
    },
  });
}

/** One choice per person per meal, so accepting another dish replaces the earlier choice. */
export function saveResponse(dish: { id: string; householdId: string; date: Date; meal: MealType }, userId: string) {
  const { householdId, date, meal } = dish;
  return prisma.mealResponse.upsert({
    where: { householdId_date_meal_userId: { householdId, date, meal, userId } },
    create: { householdId, date, meal, userId, dishId: dish.id },
    update: { dishId: dish.id, isDefault: false },
  });
}

export function deleteResponse(userId: string, dishId: string) {
  return prisma.mealResponse.deleteMany({ where: { userId, dishId } });
}

export function setDishStatus(id: string, status: 'approved' | 'declined') {
  return prisma.plannedDish.update({ where: { id }, data: { status }, include: withResponses });
}

/** Starts or restarts a day's timer. Answers filled in by an earlier timer are cleared for real ones. */
export function openDay(householdId: string, date: Date, votingEndsAt: Date) {
  return prisma.$transaction([
    prisma.mealResponse.deleteMany({ where: { householdId, date, isDefault: true } }),
    prisma.mealDay.update({
      where: { householdId_date: { householdId, date } },
      data: { status: 'open', votingEndsAt },
    }),
  ]);
}

/**
 * Makes a day final: suggestions nobody decided on are declined, and anyone who didn't answer a meal is
 * given its most chosen dish (the earliest added on a tie), so the cook still makes their portion.
 * Safe to run twice: only the run that moves the day from open to fixed does anything.
 */
export function fixDay(householdId: string, date: Date, memberIds: string[]) {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.mealDay.updateMany({
      where: { householdId, date, status: { in: ['draft', 'open'] } },
      data: { status: 'fixed', votingEndsAt: null },
    });
    if (count === 0) return false;

    await tx.plannedDish.updateMany({
      where: { householdId, date, status: 'pending' },
      data: { status: 'declined' },
    });

    const dishes = await tx.plannedDish.findMany({
      where: { householdId, date, status: 'approved' },
      include: { responses: { select: { userId: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const meals = new Set(dishes.map((dish) => dish.meal));
    for (const meal of meals) {
      const options = dishes.filter((dish) => dish.meal === meal);
      const answered = new Set(options.flatMap((dish) => dish.responses.map(({ userId }) => userId)));
      const favourite = options.reduce((best, dish) =>
        dish.responses.length > best.responses.length ? dish : best,
      );
      await tx.mealResponse.createMany({
        data: memberIds
          .filter((userId) => !answered.has(userId))
          .map((userId) => ({ householdId, date, meal, userId, dishId: favourite.id, isDefault: true })),
        skipDuplicates: true,
      });
    }
    return true;
  });
}

export function findOwnBookmark(userId: string, id: string) {
  return prisma.bookmark.findFirst({ where: { id, userId } });
}

export function findVisibleRecipe(userId: string, id: string) {
  return prisma.recipe.findFirst({
    where: { id, OR: [{ ownerId: null }, { ownerId: userId }] },
    include: {
      ingredients: { orderBy: { position: 'asc' } },
      steps: { orderBy: { stepNumber: 'asc' } },
    },
  });
}

export function findUserBookmarks(userId: string) {
  return prisma.bookmark.findMany({
    where: { userId, awaitingContent: false },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
  });
}

export function findCatalogRecipes() {
  return prisma.recipe.findMany({ where: { ownerId: null }, orderBy: { title: 'asc' } });
}

/** Dishes this household already ate, most recent first. */
export function findEatenDishes(householdId: string, meal: MealType) {
  return prisma.plannedDish.findMany({
    where: { householdId, meal, status: 'approved', responses: { some: {} } },
    orderBy: { date: 'desc' },
    take: 60,
  });
}
