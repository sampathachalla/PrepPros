import { approvedDishes, countPlannedMeals, membersOnDish } from '../utils/householdUtils';
import type { CategoryDishes, HouseholdMember, ScheduledDish } from '../types/calendar';

const dish = (partial: Partial<ScheduledDish>): ScheduledDish => ({
  id: 'd',
  name: 'Dish',
  category: 'dinner',
  date: '2026-11-05',
  isSuggestion: false,
  status: 'approved',
  memberIds: [],
  createdAt: '',
  ...partial,
});

const person = (id: string, name: string): HouseholdMember => ({
  id,
  name,
  initials: name.slice(0, 2),
  color: '#fff',
  role: 'member',
  joinedAt: '',
});

const day: CategoryDishes = {
  breakfast: [dish({ memberIds: ['priya'] })],
  lunch: [dish({ memberIds: ['priya', 'ravi'] })],
  dinner: [dish({ status: 'pending', memberIds: [] })],
  snacks: [],
};

describe('household progress', () => {
  it('counts only meals with an approved dish', () => {
    expect(approvedDishes(day.dinner)).toEqual([]);
    expect(countPlannedMeals(day)).toBe(2);
    expect(countPlannedMeals(undefined)).toBe(0);
  });
});

describe('membersOnDish', () => {
  const members = [person('priya', 'Priya'), person('ravi', 'Ravi')];

  it('finds who chose a dish', () => {
    expect(membersOnDish(members, dish({ memberIds: ['ravi'] })).map((m) => m.name)).toEqual(['Ravi']);
  });
});
