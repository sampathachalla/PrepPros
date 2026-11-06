import { MEAL_CATEGORIES } from '../../calendar/constants/calendar';
import type { PrepDish, PrepStatus, ShoppingItem } from '../types/mealPrep';

const dishMinutes = (dish: PrepDish) => (dish.prepMinutes ?? 0) + (dish.cookMinutes ?? 0);

export function nextPrepStatus(status: PrepStatus): PrepStatus {
  if (status === 'todo') return 'in_progress';
  if (status === 'in_progress') return 'done';
  return 'todo';
}

/** e.g. 45m, 2h, 2h 10m. */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  if (hours === 0) return `${minutes}m`;
  return minutes % 60 === 0 ? `${hours}h` : `${hours}h ${minutes % 60}m`;
}

export function prepSummary(dishes: PrepDish[]) {
  return {
    dishCount: dishes.length,
    doneCount: dishes.filter((dish) => dish.prepStatus === 'done').length,
    servings: dishes.reduce((total, dish) => total + dish.servings, 0),
    minutes: dishes.reduce((total, dish) => total + dishMinutes(dish), 0),
  };
}

/** The week's dishes by day, in meal order within each day. */
export function groupDishesByDay(dishes: PrepDish[]): { date: string; dishes: PrepDish[] }[] {
  const order = MEAL_CATEGORIES.map((meal) => meal.key);
  const dates = [...new Set(dishes.map((dish) => dish.date))].sort();
  return dates.map((date) => ({
    date,
    dishes: dishes
      .filter((dish) => dish.date === date)
      .sort((a, b) => order.indexOf(a.meal) - order.indexOf(b.meal)),
  }));
}

/** Quantities are free text, so they can't be scaled; this tells the cook how far to scale them. */
export function servingsNote(dish: PrepDish): string | null {
  if (!dish.baseServings || dish.baseServings === dish.servings) return null;
  return `Recipe makes ${dish.baseServings}, you need ${dish.servings}`;
}

export function shoppingProgress(items: ShoppingItem[]) {
  return { total: items.length, bought: items.filter((item) => item.checked).length };
}

/** Bought items go to the bottom, so what's left is at the top. */
export function sortShoppingItems(items: ShoppingItem[]): ShoppingItem[] {
  return [...items].sort((a, b) => Number(a.checked) - Number(b.checked));
}

/** Who a shopping line is for, e.g. "Chicken Curry (3), Dal (2)". */
export const shoppingItemDishes = (item: ShoppingItem) =>
  item.dishes.map((dish) => `${dish.name} (${dish.servings})`).join(', ');
