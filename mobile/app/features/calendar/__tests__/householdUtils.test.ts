import { approvedDishes, countPeopleAnswered, countPlannedMeals, membersOnDish, pickerNames } from '../utils/householdUtils';
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

describe('pickerNames', () => {
  const priya = person('priya', 'Priya Sharma');
  const ravi = person('ravi', 'Ravi');
  const anu = person('anu', 'Anu');
  const me = person('me', 'Sampath');

  it('uses first names and is empty when nobody picked', () => {
    expect(pickerNames([priya, ravi], 'me')).toBe('Priya, Ravi');
    expect(pickerNames([], 'me')).toBe('');
  });

  it('puts you first', () => {
    expect(pickerNames([priya, me], 'me')).toBe('You, Priya');
  });

  it('shortens long lists', () => {
    expect(pickerNames([priya, ravi, anu, me], 'nobody')).toBe('Priya, Ravi, Anu +1');
  });
});

describe('countPeopleAnswered', () => {
  const members = [person('priya', 'Priya'), person('ravi', 'Ravi')];

  it('counts a person with two picks once', () => {
    const dishes = [dish({ memberIds: ['priya'] }), dish({ memberIds: ['priya'] })];
    expect(countPeopleAnswered(members, dishes)).toBe(1);
  });

  it('ignores anyone no longer in the household', () => {
    expect(countPeopleAnswered(members, [dish({ memberIds: ['ravi', 'left'] })])).toBe(1);
  });
});
