import { prisma } from '../../config/db.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { ListRecipesQuery } from './schema.js';

/** Catalog recipes plus the user's own custom recipes. */
const visibleTo = (userId: string): Prisma.RecipeWhereInput => ({
  OR: [{ ownerId: null }, { ownerId: userId }],
});

/** Ingredients and steps in order, plus the user's bookmark (if any) to derive `isBookmarked`. */
const detailsFor = (userId: string) =>
  ({
    ingredients: { orderBy: { position: 'asc' } },
    steps: { orderBy: { stepNumber: 'asc' } },
    bookmarks: { where: { userId }, select: { id: true } },
  }) satisfies Prisma.RecipeInclude;

export type RecipeWithDetails = Prisma.RecipeGetPayload<{ include: ReturnType<typeof detailsFor> }>;

export function findVisibleRecipes(userId: string, query: ListRecipesQuery) {
  const filters: Prisma.RecipeWhereInput[] = [visibleTo(userId)];
  if (query.category !== 'all') filters.push({ category: query.category });
  if (query.search) filters.push({ title: { contains: query.search, mode: 'insensitive' } });

  return prisma.recipe.findMany({
    where: { AND: filters },
    include: detailsFor(userId),
    orderBy: [{ createdAt: 'desc' }, { title: 'asc' }],
  });
}

export function findVisibleRecipe(userId: string, id: string) {
  return prisma.recipe.findFirst({
    where: { AND: [{ id }, visibleTo(userId)] },
    include: detailsFor(userId),
  });
}

export function createRecipe(
  ownerId: string,
  data: Omit<Prisma.RecipeUncheckedCreateInput, 'ownerId' | 'ingredients' | 'steps'>,
  ingredients: string[],
  steps: string[],
) {
  return prisma.recipe.create({
    data: {
      ...data,
      ownerId,
      ingredients: { create: ingredients.map((name, position) => ({ name, position })) },
      steps: { create: steps.map((instruction, index) => ({ instruction, stepNumber: index + 1 })) },
    },
    include: detailsFor(ownerId),
  });
}

/** Deletes the recipe only if the user owns it; returns how many rows were removed. */
export async function deleteOwnedRecipe(ownerId: string, id: string): Promise<number> {
  const { count } = await prisma.recipe.deleteMany({ where: { id, ownerId } });
  return count;
}

/** Creates the user's bookmark for a recipe, or returns the existing one. */
export function upsertRecipeBookmark(
  userId: string,
  recipeId: string,
  snapshot: Omit<Prisma.BookmarkUncheckedCreateInput, 'userId' | 'recipeId' | 'source'>,
) {
  return prisma.bookmark.upsert({
    where: { userId_recipeId: { userId, recipeId } },
    create: { ...snapshot, userId, recipeId, source: 'app' },
    update: {},
  });
}

export function deleteRecipeBookmark(userId: string, recipeId: string) {
  return prisma.bookmark.deleteMany({ where: { userId, recipeId } });
}
