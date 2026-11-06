import { prisma } from '../../config/db.js';
import type { Prisma } from '../../generated/prisma/client.js';

export function findWeekDays(householdId: string, from: Date, to: Date) {
  return prisma.mealDay.findMany({ where: { householdId, date: { gte: from, lte: to } } });
}

/** Dishes somebody is eating on a fixed day: exactly what has to be cooked. */
export function findFixedDishes(householdId: string, fixedDates: Date[]) {
  return prisma.plannedDish.findMany({
    where: { householdId, date: { in: fixedDates }, status: 'approved', responses: { some: {} } },
    include: { responses: { select: { userId: true } } },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  });
}

export function findChecks(householdId: string, weekStart: Date) {
  return prisma.shoppingCheck.findMany({ where: { householdId, weekStart } });
}

export function findDish(householdId: string, id: string) {
  return prisma.plannedDish.findFirst({ where: { id, householdId } });
}

export function isDayFixed(householdId: string, date: Date) {
  return prisma.mealDay.count({ where: { householdId, date, status: 'fixed' } });
}

export function updateDish(id: string, data: Prisma.PlannedDishUncheckedUpdateInput) {
  return prisma.plannedDish.update({ where: { id }, data });
}

export function setCheck(householdId: string, weekStart: Date, itemKey: string, checked: boolean) {
  const key = { householdId, weekStart, itemKey };
  return checked
    ? prisma.shoppingCheck.createMany({ data: [key], skipDuplicates: true })
    : prisma.shoppingCheck.deleteMany({ where: key });
}
