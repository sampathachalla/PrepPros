import type { BookmarkCategory, HouseholdMember, MealType, RecipeCategory } from '../../generated/prisma/client.js';
import { AppError, notFound } from '../../utils/AppError.js';
import { earliestEditableDate, fromDbDate, toDbDate } from '../../utils/dates.js';
import { findHouseholdById } from '../household/repository.js';
import { requireAdmin, requireMembership } from '../household/service.js';
import * as repository from './repository.js';
import type { DishWithResponses } from './repository.js';
import type { AddDishInput } from './schema.js';

const OPTION_LIMIT = 8;

const MEAL_CATEGORIES: Record<MealType, (BookmarkCategory | RecipeCategory)[]> = {
  breakfast: ['breakfast'],
  lunch: ['lunch_dinner', 'high_protein', 'quick_prep', 'vegetarian'],
  dinner: ['lunch_dinner', 'high_protein', 'quick_prep', 'vegetarian'],
  snacks: ['snacks', 'dessert'],
};

const fixedDay = () => new AppError(409, 'This day is fixed. Restart the timer to change it.');
const timerNotRunning = () => new AppError(409, 'The timer for this day isn’t running');

function assertNotPast(date: Date) {
  if (date < earliestEditableDate()) throw new AppError(409, 'This day has already passed');
}

async function assertHasApprovedDish(householdId: string, date: Date, action: string) {
  const dishes = await repository.findDishes(householdId, date, date);
  if (!dishes.some((dish) => dish.status === 'approved')) {
    throw new AppError(409, `Add a dish to ${fromDbDate(date)} before ${action}`);
  }
}

/** Same shape as the mobile app's `ScheduledDish` type. */
function toDishResponse(dish: DishWithResponses) {
  return {
    id: dish.id,
    date: fromDbDate(dish.date),
    category: dish.meal,
    name: dish.name,
    notes: dish.notes ?? undefined,
    imageUrl: dish.imageUrl ?? undefined,
    prepMinutes: dish.prepMinutes ?? undefined,
    cookMinutes: dish.cookMinutes ?? undefined,
    isSuggestion: dish.isSuggestion,
    status: dish.status,
    addedById: dish.addedById ?? undefined,
    memberIds: dish.responses.map(({ userId }) => userId),
    createdAt: dish.createdAt.toISOString(),
  };
}

/** Moves days whose timer has run out to fixed. Runs on read, so there is no job to keep alive. */
export async function fixExpiredDays(householdId: string) {
  const expired = await repository.findExpiredDays(householdId, new Date());
  if (expired.length === 0) return;
  const memberIds = await currentMemberIds(householdId);
  for (const { date } of expired) await repository.fixDay(householdId, date, memberIds);
}

async function currentMemberIds(householdId: string) {
  const household = await findHouseholdById(householdId);
  return household?.members.map((member) => member.userId) ?? [];
}

/**
 * A suggestion is between the person who made it and the admin. Members also never see a day the
 * admin is still drafting; on a running or fixed day everyone sees the plan.
 */
function isVisible(dish: DishWithResponses, membership: HouseholdMember, draftDates: Set<string>) {
  if (membership.role === 'admin' && dish.status !== 'declined') return true;
  if (dish.addedById === membership.userId) return true;
  return dish.status === 'approved' && !draftDates.has(fromDbDate(dish.date));
}

export async function getCalendar(userId: string, from: string, to: string) {
  const membership = await requireMembership(userId);
  await fixExpiredDays(membership.householdId);

  const [days, dishes] = await Promise.all([
    repository.findDays(membership.householdId, toDbDate(from), toDbDate(to)),
    repository.findDishes(membership.householdId, toDbDate(from), toDbDate(to)),
  ]);
  const draftDates = new Set(days.filter((day) => day.status === 'draft').map((day) => fromDbDate(day.date)));

  return {
    serverTime: new Date().toISOString(),
    days: days.map((day) => ({
      date: fromDbDate(day.date),
      status: day.status,
      votingEndsAt: day.votingEndsAt?.toISOString(),
    })),
    dishes: dishes.filter((dish) => isVisible(dish, membership, draftDates)).map(toDishResponse),
  };
}

/** What a new dish copies from where it came from. */
async function dishDetails(userId: string, householdId: string, input: AddDishInput) {
  if (input.recipeId) {
    const recipe = await repository.findVisibleRecipe(userId, input.recipeId);
    if (!recipe) throw notFound('Recipe');
    return {
      name: recipe.title,
      recipeId: recipe.id,
      imageUrl: recipe.imageUrl,
      prepMinutes: recipe.prepTimeMinutes,
      cookMinutes: recipe.cookTimeMinutes,
      baseServings: recipe.servings,
      ingredients: recipe.ingredients.map(({ amount, name }) => (amount ? `${amount} ${name}` : name)),
      steps: recipe.steps.map((step) => step.instruction),
    };
  }
  if (input.bookmarkId) {
    const bookmark = await repository.findOwnBookmark(userId, input.bookmarkId);
    if (!bookmark) throw notFound('Bookmark');
    if (bookmark.awaitingContent) throw new AppError(409, 'This recipe is still being read');
    return {
      name: bookmark.title,
      bookmarkId: bookmark.id,
      recipeId: bookmark.recipeId,
      imageUrl: bookmark.thumbnailUrl,
      prepMinutes: bookmark.prepTimeMinutes,
      cookMinutes: bookmark.cookTimeMinutes,
      baseServings: bookmark.servings,
      ingredients: bookmark.ingredients,
      notes: bookmark.url ? `Recipe: ${bookmark.url}` : undefined,
    };
  }
  if (input.fromDishId) {
    const dish = await repository.findDish(householdId, input.fromDishId);
    if (!dish) throw notFound('Dish');
    const { name, recipeId, imageUrl, prepMinutes, cookMinutes, baseServings, ingredients, steps } = dish;
    return { name, recipeId, imageUrl, prepMinutes, cookMinutes, baseServings, ingredients, steps };
  }
  return { name: input.name! };
}

/** You can only swap your own dish on the same meal, and a member's only until the admin approves it. */
async function assertCanReplace(membership: HouseholdMember, id: string, date: Date, meal: MealType) {
  const dish = await findDishOrThrow(membership.householdId, id);
  const sameMeal = dish.date.getTime() === date.getTime() && dish.meal === meal;
  if (!sameMeal || dish.addedById !== membership.userId || dish.status === 'declined') {
    throw new AppError(403, 'You can only replace your own dish on this meal');
  }
  if (membership.role !== 'admin' && dish.status !== 'pending') {
    throw new AppError(409, 'The admin has approved this dish, so it can’t be replaced');
  }
}

/**
 * Admins add to the plan. Members suggest instead, one dish per meal: to change it they replace it.
 * Admins aren't limited here, so saving from Bookmarks or Recipes can still add more; the day screen holds them to one.
 */
export async function addDish(userId: string, input: AddDishInput) {
  const membership = await requireMembership(userId);
  const { householdId } = membership;
  await fixExpiredDays(householdId);

  const date = toDbDate(input.date);
  assertNotPast(date);
  const isAdmin = membership.role === 'admin';
  const day = await repository.findDay(householdId, date);
  if (day?.status === 'fixed') throw fixedDay();

  if (input.replacesDishId) {
    await assertCanReplace(membership, input.replacesDishId, date, input.meal);
  } else if (!isAdmin && (await repository.findOwnDish(householdId, date, input.meal, userId))) {
    throw new AppError(409, 'You already have a dish on this meal. Update it to change it.');
  }

  const details = await dishDetails(userId, householdId, input);
  const duplicate = await repository.findDuplicateDish(householdId, date, input.meal, details.name);
  if (duplicate) {
    throw new AppError(409, isAdmin ? 'This dish is already on this meal' : 'Someone has already suggested this');
  }

  await repository.ensureDraftDay(householdId, date);
  const data = {
    notes: input.notes,
    ...details,
    householdId,
    date,
    meal: input.meal,
    addedById: userId,
    isSuggestion: !isAdmin,
    status: isAdmin ? ('approved' as const) : ('pending' as const),
  };
  const dish = input.replacesDishId
    ? await repository.replaceDish(input.replacesDishId, data)
    : await repository.createDish(data);
  // Adding a dish counts as picking it. A suggestion gets its pick when the admin approves it.
  if (isAdmin) await repository.saveResponse(dish, userId);
  return toDishResponse(await findDishOrThrow(householdId, dish.id));
}

async function findDishOrThrow(householdId: string, id: string) {
  const dish = await repository.findDish(householdId, id);
  if (!dish) throw notFound('Dish');
  return dish;
}

/** Admins can take off any dish until the day is fixed; members can withdraw their own open suggestion. */
export async function removeDish(userId: string, id: string) {
  const membership = await requireMembership(userId);
  await fixExpiredDays(membership.householdId);
  const dish = await findDishOrThrow(membership.householdId, id);
  const day = await repository.findDay(membership.householdId, dish.date);
  if (day?.status === 'fixed') throw fixedDay();

  const ownSuggestion = dish.status === 'pending' && dish.addedById === userId;
  if (membership.role !== 'admin' && !ownSuggestion) {
    throw new AppError(403, 'Only the household admin can do this');
  }
  await repository.deleteDish(id);
}

/** The dish's day, once checked that the timer is running. */
async function requireRunningTimer(householdId: string, date: Date) {
  const day = await repository.findDay(householdId, date);
  if (day?.status === 'fixed') throw fixedDay();
  if (day?.status !== 'open') throw timerNotRunning();
}

export async function acceptDish(userId: string, id: string) {
  const membership = await requireMembership(userId);
  await fixExpiredDays(membership.householdId);
  const dish = await findDishOrThrow(membership.householdId, id);
  await requireRunningTimer(membership.householdId, dish.date);
  if (dish.status !== 'approved') throw new AppError(409, 'This suggestion hasn’t been approved yet');
  await repository.saveResponse(dish, userId);
  return toDishResponse(await findDishOrThrow(membership.householdId, id));
}

export async function withdrawAcceptance(userId: string, id: string) {
  const membership = await requireMembership(userId);
  await fixExpiredDays(membership.householdId);
  const dish = await findDishOrThrow(membership.householdId, id);
  await requireRunningTimer(membership.householdId, dish.date);
  await repository.deleteResponse(userId, id);
  return toDishResponse(await findDishOrThrow(membership.householdId, id));
}

/** Approving a suggestion puts it on the plan and counts the person who suggested it as eating it. */
export async function decideSuggestion(userId: string, id: string, approve: boolean) {
  const membership = await requireMembership(userId);
  requireAdmin(membership);
  await fixExpiredDays(membership.householdId);
  const dish = await findDishOrThrow(membership.householdId, id);
  const day = await repository.findDay(membership.householdId, dish.date);
  if (day?.status === 'fixed') throw fixedDay();
  if (dish.status !== 'pending') throw new AppError(409, 'This suggestion was already decided');

  const decided = await repository.setDishStatus(id, approve ? 'approved' : 'declined');
  if (approve && decided.addedById) {
    const stillHere = (await currentMemberIds(membership.householdId)).includes(decided.addedById);
    if (stillHere) await repository.saveResponse(decided, decided.addedById);
  }
  return toDishResponse(await findDishOrThrow(membership.householdId, id));
}

/** Starts the timer on the chosen days: everyone can now see them and answer. */
export async function startTimer(userId: string, dates: string[], durationMinutes: number) {
  const membership = await requireMembership(userId);
  requireAdmin(membership);
  const { householdId } = membership;
  await fixExpiredDays(householdId);

  const days = [...new Set(dates)].map(toDbDate);
  for (const date of days) {
    assertNotPast(date);
    await assertHasApprovedDish(householdId, date, 'starting its timer');
  }

  const votingEndsAt = new Date(Date.now() + durationMinutes * 60_000);
  for (const date of days) await repository.openDay(householdId, date, votingEndsAt);
  return { votingEndsAt: votingEndsAt.toISOString(), dates: days.map(fromDbDate) };
}

/** Ends a day's timer early. */
/** Ends a running timer, or lets the admin skip the timer altogether on a planned day. */
export async function fixDayNow(userId: string, dateKey: string) {
  const membership = await requireMembership(userId);
  requireAdmin(membership);
  const { householdId } = membership;
  const date = toDbDate(dateKey);
  const day = await repository.findDay(householdId, date);
  if (day?.status === 'fixed') throw fixedDay();
  if (day?.status !== 'open') {
    assertNotPast(date);
    await assertHasApprovedDish(householdId, date, 'fixing it');
  }
  await repository.fixDay(householdId, date, await currentMemberIds(householdId));
}

const fitsMeal = (meal: MealType, category: BookmarkCategory | RecipeCategory | null) =>
  category === null || MEAL_CATEGORIES[meal].includes(category);

/** The three lists shown when picking a dish: recently saved, liked, and suggested. */
export async function getDishOptions(userId: string, meal: MealType) {
  const { householdId } = await requireMembership(userId);
  const [bookmarks, catalog, eaten] = await Promise.all([
    repository.findUserBookmarks(userId),
    repository.findCatalogRecipes(),
    repository.findEatenDishes(householdId, meal),
  ]);

  const fitting = bookmarks.filter((bookmark) => fitsMeal(meal, bookmark.category));
  const toOption = (bookmark: (typeof bookmarks)[number]) => ({
    key: `bookmark:${bookmark.id}`,
    name: bookmark.title,
    imageUrl: bookmark.thumbnailUrl,
    minutes: (bookmark.prepTimeMinutes ?? 0) + (bookmark.cookTimeMinutes ?? 0) || undefined,
    bookmarkId: bookmark.id,
  });

  const recentlySaved = fitting
    .filter((bookmark) => bookmark.source !== 'app')
    .slice(0, OPTION_LIMIT)
    .map(toOption);
  const liked = fitting
    .filter((bookmark) => bookmark.source === 'app')
    .slice(0, OPTION_LIMIT)
    .map(toOption);

  // Meals the household has already eaten come first, then catalog recipes nobody has liked yet
  const likedRecipeIds = new Set(bookmarks.map((bookmark) => bookmark.recipeId));
  const seen = new Set<string>();
  const firstByName = <T extends { name: string }>(option: T) => {
    const key = option.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };
  const suggested = [
    ...eaten.map((dish) => ({
      key: `dish:${dish.id}`,
      name: dish.name,
      imageUrl: dish.imageUrl ?? undefined,
      minutes: (dish.prepMinutes ?? 0) + (dish.cookMinutes ?? 0) || undefined,
      fromDishId: dish.id,
      reason: 'Your household had this',
    })),
    ...catalog
      .filter((recipe) => fitsMeal(meal, recipe.category) && !likedRecipeIds.has(recipe.id))
      .map((recipe) => ({
        key: `recipe:${recipe.id}`,
        name: recipe.title,
        imageUrl: recipe.imageUrl,
        minutes: recipe.prepTimeMinutes + (recipe.cookTimeMinutes ?? 0),
        recipeId: recipe.id,
        reason: 'From PrepPros',
      })),
  ]
    .filter(firstByName)
    .slice(0, OPTION_LIMIT);

  return { recentlySaved, liked, suggested };
}
