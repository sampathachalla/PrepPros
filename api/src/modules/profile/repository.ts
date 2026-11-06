import { prisma } from '../../config/db.js';
import { publicUserSelect } from '../auth/repository.js';
import type { UpdatePreferencesInput, UpdateProfileInput } from './schema.js';

const preferencesSelect = { mealReminders: true, showPrepTips: true } as const;

export function findUser(id: string) {
  return prisma.user.findUnique({ where: { id }, select: publicUserSelect });
}

export function findUserByUsername(username: string) {
  return prisma.user.findUnique({ where: { username }, select: { id: true } });
}

export function updateUser(id: string, data: UpdateProfileInput) {
  return prisma.user.update({ where: { id }, data, select: publicUserSelect });
}

/** The user's preferences, created with defaults for accounts that predate them. */
export function getOrCreatePreferences(userId: string) {
  return prisma.userPreferences.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: preferencesSelect,
  });
}

export function updatePreferences(userId: string, data: UpdatePreferencesInput) {
  return prisma.userPreferences.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
    select: preferencesSelect,
  });
}

export async function countStats(userId: string) {
  const [recipesSaved, bookmarks, mealsPlanned] = await Promise.all([
    prisma.recipe.count({ where: { ownerId: userId } }),
    prisma.bookmark.count({ where: { userId } }),
    prisma.mealResponse.count({ where: { userId } }),
  ]);
  return { recipesSaved, bookmarks, mealsPlanned };
}
