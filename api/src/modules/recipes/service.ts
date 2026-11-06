import { AppError, notFound } from '../../utils/AppError.js';
import { toBookmarkResponse } from '../bookmarks/service.js';
import * as repository from './repository.js';
import type { RecipeWithDetails } from './repository.js';
import type { CreateRecipeInput, ListRecipesQuery } from './schema.js';

const DEFAULT_IMAGE_URL =
  'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80';

/** Same shape as the mobile app's `Recipe` type. */
export function toRecipeResponse(recipe: RecipeWithDetails) {
  return {
    id: recipe.id,
    title: recipe.title,
    category: recipe.category,
    prepTimeMinutes: recipe.prepTimeMinutes,
    cookTimeMinutes: recipe.cookTimeMinutes ?? undefined,
    servings: recipe.servings,
    difficulty: recipe.difficulty,
    imageUrl: recipe.imageUrl,
    isBookmarked: recipe.bookmarks.length > 0,
    isCustom: recipe.ownerId !== null,
    ingredients: recipe.ingredients.map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      amount: ingredient.amount ?? undefined,
    })),
    steps: recipe.steps.map((step) => ({
      stepNumber: step.stepNumber,
      instruction: step.instruction,
    })),
    createdAt: recipe.createdAt.toISOString(),
  };
}

const toLines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

async function getVisibleRecipeOrThrow(userId: string, id: string) {
  const recipe = await repository.findVisibleRecipe(userId, id);
  if (!recipe) throw notFound('Recipe');
  return recipe;
}

export async function listRecipes(userId: string, query: ListRecipesQuery) {
  const recipes = await repository.findVisibleRecipes(userId, query);
  return recipes.map(toRecipeResponse);
}

export async function getRecipe(userId: string, id: string) {
  return toRecipeResponse(await getVisibleRecipeOrThrow(userId, id));
}

export async function createRecipe(userId: string, input: CreateRecipeInput) {
  const recipe = await repository.createRecipe(
    userId,
    {
      title: input.title,
      category: input.category,
      prepTimeMinutes: input.prepTimeMinutes,
      cookTimeMinutes: input.cookTimeMinutes,
      servings: input.servings,
      difficulty: input.difficulty,
      imageUrl: input.imageUrl ?? DEFAULT_IMAGE_URL,
    },
    toLines(input.ingredientsText),
    toLines(input.instructionsText),
  );
  return toRecipeResponse(recipe);
}

/** Only the user's own custom recipes can be deleted; catalog recipes are shared. */
export async function deleteRecipe(userId: string, id: string) {
  const deleted = await repository.deleteOwnedRecipe(userId, id);
  if (deleted > 0) return;

  await getVisibleRecipeOrThrow(userId, id);
  throw new AppError(403, 'Only your own custom recipes can be deleted');
}

/** Saves the recipe to the user's bookmarks (idempotent). */
export async function bookmarkRecipe(userId: string, id: string) {
  const recipe = await getVisibleRecipeOrThrow(userId, id);
  const bookmark = await repository.upsertRecipeBookmark(userId, recipe.id, {
    title: recipe.title,
    url: '',
    thumbnailUrl: recipe.imageUrl,
    author: 'PrepPros Kitchen',
    category: recipe.category,
    prepTimeMinutes: recipe.prepTimeMinutes,
    cookTimeMinutes: recipe.cookTimeMinutes,
    servings: recipe.servings,
    ingredients: recipe.ingredients.map((ingredient) => ingredient.name),
    notes: `Difficulty: ${recipe.difficulty}`,
  });
  return { isBookmarked: true, bookmark: toBookmarkResponse(bookmark) };
}

/** Removes the recipe from the user's bookmarks (idempotent). */
export async function unbookmarkRecipe(userId: string, id: string) {
  await getVisibleRecipeOrThrow(userId, id);
  await repository.deleteRecipeBookmark(userId, id);
}
