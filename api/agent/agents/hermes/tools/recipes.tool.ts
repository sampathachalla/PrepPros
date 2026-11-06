import { z } from 'zod';
import { preppros } from '../apiClient.ts';
import type { Bookmark, Recipe } from '../apiClient.ts';
import { rankDocuments } from '../needle.ts';
import { accessTicket } from './ticket.ts';
import { defineTool } from './types.ts';

const MAX_LISTED_INGREDIENTS = 12;

const totalMinutes = (item: { prepTimeMinutes?: number; cookTimeMinutes?: number }) =>
  (item.prepTimeMinutes ?? 0) + (item.cookTimeMinutes ?? 0) || undefined;

const humanCategory = (category: string) => category.replace(/_/g, ' ');

export function recipeSearchText(recipe: Recipe) {
  const minutes = totalMinutes(recipe);
  return [
    recipe.title,
    humanCategory(recipe.category),
    recipe.difficulty,
    minutes ? `ready in ${minutes} minutes` : '',
    `ingredients: ${recipe.ingredients.map((ingredient) => ingredient.name).join(', ')}`,
  ]
    .filter(Boolean)
    .join('. ');
}

export function bookmarkSearchText(bookmark: Bookmark) {
  const minutes = totalMinutes(bookmark);
  return [
    bookmark.title,
    humanCategory(bookmark.category),
    minutes ? `ready in ${minutes} minutes` : '',
    bookmark.ingredients.length ? `ingredients: ${bookmark.ingredients.join(', ')}` : '',
    bookmark.notes ?? '',
  ]
    .filter(Boolean)
    .join('. ');
}

const summariseRecipe = (recipe: Recipe) => ({
  type: 'recipe' as const,
  id: recipe.id,
  title: recipe.title,
  category: recipe.category,
  totalMinutes: totalMinutes(recipe),
  servings: recipe.servings,
  difficulty: recipe.difficulty,
  bookmarked: recipe.isBookmarked,
  ingredients: recipe.ingredients.slice(0, MAX_LISTED_INGREDIENTS).map((ingredient) => ingredient.name),
});

export const summariseBookmark = (bookmark: Bookmark) => ({
  type: 'bookmark' as const,
  id: bookmark.id,
  title: bookmark.title,
  category: bookmark.category,
  source: bookmark.source,
  url: bookmark.url || undefined,
  author: bookmark.author,
  totalMinutes: totalMinutes(bookmark),
  servings: bookmark.servings,
  ingredients: bookmark.ingredients.slice(0, MAX_LISTED_INGREDIENTS),
});

export const searchRecipesTool = defineTool({
  name: 'search_recipes',
  description:
    "Search the user's PrepPros recipes (catalog and their own) and saved Instagram/YouTube bookmarks by " +
    'meaning, e.g. "quick high-protein lunch", "something with chickpeas". Returns the best matches first.',
  inputSchema: {
    access_ticket: accessTicket,
    query: z.string().trim().min(2).max(200).describe('What the user is looking for, in plain words.'),
    limit: z.number().int().min(1).max(10).default(5),
  },
  async run({ access_ticket: ticket, query, limit }) {
    const [recipes, bookmarks] = await Promise.all([
      preppros.listRecipes(ticket),
      preppros.listBookmarks(ticket, 'all'),
    ]);
    // A bookmarked app recipe is already listed as a recipe
    const savedLinks = bookmarks.filter((bookmark) => !bookmark.recipeId);

    const byKey = new Map<string, ReturnType<typeof summariseRecipe> | ReturnType<typeof summariseBookmark>>();
    const documents = [
      ...recipes.map((recipe) => {
        byKey.set(`recipe:${recipe.id}`, summariseRecipe(recipe));
        return { key: `recipe:${recipe.id}`, text: recipeSearchText(recipe) };
      }),
      ...savedLinks.map((bookmark) => {
        byKey.set(`bookmark:${bookmark.id}`, summariseBookmark(bookmark));
        return { key: `bookmark:${bookmark.id}`, text: bookmarkSearchText(bookmark) };
      }),
    ];
    if (documents.length === 0) return { matches: [], note: 'The user has no recipes or bookmarks yet.' };

    const ranked = await rankDocuments(query, documents);
    return { matches: ranked.slice(0, limit).map(({ key }) => byKey.get(key)) };
  },
});

export const getRecipeTool = defineTool({
  name: 'get_recipe',
  description: 'Get one PrepPros recipe with all its ingredients (with amounts) and step-by-step instructions.',
  inputSchema: {
    access_ticket: accessTicket,
    recipe_id: z.uuid().describe('The id of a recipe returned by search_recipes.'),
  },
  async run({ access_ticket: ticket, recipe_id: id }) {
    const recipe = await preppros.getRecipe(ticket, id);
    return { ...recipe, totalMinutes: totalMinutes(recipe) };
  },
});

export const bookmarkRecipeTool = defineTool({
  name: 'bookmark_recipe',
  description:
    "Save a PrepPros recipe to the user's bookmarks. Only call this when the user asks to save or bookmark it.",
  inputSchema: {
    access_ticket: accessTicket,
    recipe_id: z.uuid().describe('The id of a recipe returned by search_recipes.'),
  },
  async run({ access_ticket: ticket, recipe_id: id }) {
    await preppros.bookmarkRecipe(ticket, id);
    return { saved: true, recipeId: id };
  },
});
