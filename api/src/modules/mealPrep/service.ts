import { AppError, notFound } from '../../utils/AppError.js';
import { addDays, fromDbDate, toDbDate } from '../../utils/dates.js';
import { fixExpiredDays } from '../calendar/service.js';
import { findMembership } from '../household/repository.js';
import { requireMembership } from '../household/service.js';
import * as repository from './repository.js';
import type { UpdatePrepDishInput } from './schema.js';

const normalize = (ingredient: string) => ingredient.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Identical lines across a week's dishes become one shopping item. Quantities are free text ("2 lbs",
 * "a handful"), so they aren't added up; each dish shows how many servings it needs instead.
 */
function buildShoppingList(
  dishes: { name: string; ingredients: string[]; servings: number }[],
  checkedKeys: Set<string>,
) {
  const items = new Map<string, { key: string; name: string; dishes: { name: string; servings: number }[] }>();
  for (const dish of dishes) {
    for (const ingredient of dish.ingredients) {
      const key = normalize(ingredient).slice(0, 200);
      if (!key) continue;
      const item = items.get(key) ?? { key, name: ingredient.trim(), dishes: [] };
      item.dishes.push({ name: dish.name, servings: dish.servings });
      items.set(key, item);
    }
  }
  return [...items.values()]
    .map((item) => ({ ...item, checked: checkedKeys.has(item.key) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The week's prep, worked out from what the household fixed: who eats what, and what to buy. */
export async function getMealPrep(userId: string, weekStart: string) {
  const { householdId } = await requireMembership(userId);
  const start = toDbDate(weekStart);
  const end = addDays(start, 6);
  await fixExpiredDays(householdId);

  const days = await repository.findWeekDays(householdId, start, end);
  const fixedDates = days.filter((day) => day.status === 'fixed').map((day) => day.date);
  const [rows, checks] = await Promise.all([
    repository.findFixedDishes(householdId, fixedDates),
    repository.findChecks(householdId, start),
  ]);

  const dishes = rows.map((dish) => ({
    id: dish.id,
    date: fromDbDate(dish.date),
    meal: dish.meal,
    name: dish.name,
    imageUrl: dish.imageUrl ?? undefined,
    notes: dish.notes ?? undefined,
    servings: dish.responses.length,
    baseServings: dish.baseServings ?? undefined,
    memberIds: dish.responses.map((response) => response.userId),
    prepMinutes: dish.prepMinutes ?? undefined,
    cookMinutes: dish.cookMinutes ?? undefined,
    ingredients: dish.ingredients,
    steps: dish.steps,
    prepStatus: dish.prepStatus,
    assigneeId: dish.prepAssigneeId ?? undefined,
  }));

  return {
    weekStart,
    dishes,
    shopping: buildShoppingList(dishes, new Set(checks.map((check) => check.itemKey))),
    fixedDayCount: fixedDates.length,
    /** Days still being decided, so the page can say the list isn't final. */
    undecidedDayCount: days.filter((day) => day.status !== 'fixed').length,
  };
}

export async function updatePrepDish(userId: string, id: string, input: UpdatePrepDishInput) {
  const { householdId } = await requireMembership(userId);
  const dish = await repository.findDish(householdId, id);
  if (!dish) throw notFound('Dish');
  if (!(await repository.isDayFixed(householdId, dish.date))) {
    throw new AppError(409, 'This day isn’t fixed yet');
  }
  if (input.assigneeId) {
    const assignee = await findMembership(input.assigneeId);
    if (assignee?.householdId !== householdId) throw notFound('Member');
  }
  await repository.updateDish(id, {
    prepStatus: input.prepStatus,
    prepAssigneeId: input.assigneeId,
  });
}

export async function setShoppingCheck(userId: string, weekStart: string, key: string, checked: boolean) {
  const { householdId } = await requireMembership(userId);
  await repository.setCheck(householdId, toDbDate(weekStart), key, checked);
}
