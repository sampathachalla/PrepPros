import { MEAL_CATEGORIES } from '../constants/calendar';
import type { CategoryDishes, HouseholdMember, ScheduledDish } from '../types/calendar';

/** Dishes people can choose from: approved ones only. */
export const approvedDishes = (dishes: ScheduledDish[] = []) => dishes.filter((dish) => dish.status === 'approved');

/** How many meals on this day have something to choose. */
export function countPlannedMeals(day: CategoryDishes | undefined): number {
  return MEAL_CATEGORIES.filter(({ key }) => approvedDishes(day?.[key]).length > 0).length;
}

export function membersOnDish(members: HouseholdMember[], dish: ScheduledDish): HouseholdMember[] {
  const ids = new Set(dish.memberIds);
  return members.filter((member) => ids.has(member.id));
}
