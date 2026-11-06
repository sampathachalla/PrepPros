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

const MAX_NAMES = 3;

const firstName = (name: string) => name.trim().split(/\s+/)[0];

/** Who picked a dish, as read under its name: you first, then "+N" once there are too many to fit. */
export function pickerNames(pickers: HouseholdMember[], myId: string): string {
  const names = [...pickers]
    .sort((a, b) => Number(b.id === myId) - Number(a.id === myId))
    .map((member) => (member.id === myId ? 'You' : firstName(member.name)));
  const hidden = names.length - MAX_NAMES;
  return hidden > 0 ? `${names.slice(0, MAX_NAMES).join(', ')} +${hidden}` : names.join(', ');
}

/** How many people have picked something for a meal; several picks by one person count once. */
export function countPeopleAnswered(members: HouseholdMember[], dishes: ScheduledDish[]): number {
  return members.filter((member) => dishes.some((dish) => dish.memberIds.includes(member.id))).length;
}
