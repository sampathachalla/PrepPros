import { MEAL_CATEGORIES } from '../../calendar/constants/calendar';
import type { CategoryDishes, ScheduledDish } from '../../calendar/types/calendar';
import { addDays } from '../../calendar/utils/dateUtils';
import { getWeekStartKey } from '../../calendar/utils/planningHorizonUtils';

/** Planning looks ahead, so the page opens on the first day of next week. */
export const firstDayOfNextWeek = (todayKey: string) => addDays(getWeekStartKey(todayKey), 7);

/** Every suggestion still waiting for a decision on these days, in day and meal order. */
export function waitingSuggestions(dishesByDate: Record<string, CategoryDishes>, dates: string[]): ScheduledDish[] {
  return dates.flatMap((date) =>
    MEAL_CATEGORIES.flatMap(({ key }) =>
      (dishesByDate[date]?.[key] ?? []).filter((dish) => dish.status === 'pending'),
    ),
  );
}

/** What this person added in a week and hasn't had turned down: their usual meals to carry forward. */
export function picksToCopy(
  dishesByDate: Record<string, CategoryDishes>,
  dates: string[],
  myId: string,
): ScheduledDish[] {
  return dates.flatMap((date) =>
    MEAL_CATEGORIES.flatMap(({ key }) =>
      (dishesByDate[date]?.[key] ?? []).filter((dish) => dish.addedById === myId && dish.status !== 'declined'),
    ),
  );
}
