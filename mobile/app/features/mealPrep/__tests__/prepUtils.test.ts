import {
  formatMinutes,
  groupDishesByDay,
  nextPrepStatus,
  prepSummary,
  servingsNote,
  shoppingItemDishes,
  shoppingProgress,
  sortShoppingItems,
} from '../utils/prepUtils';
import type { PrepDish, ShoppingItem } from '../types/mealPrep';

const dish = (partial: Partial<PrepDish>): PrepDish => ({
  id: 'd',
  date: '2026-11-05',
  meal: 'dinner',
  name: 'Curry',
  servings: 2,
  memberIds: [],
  ingredients: [],
  steps: [],
  prepStatus: 'todo',
  ...partial,
});

const item = (key: string, checked = false): ShoppingItem => ({
  key,
  name: key,
  checked,
  dishes: [{ name: 'Curry', servings: 3 }],
});

describe('prep tasks', () => {
  it('moves through to do, cooking, done, and back', () => {
    expect(nextPrepStatus('todo')).toBe('in_progress');
    expect(nextPrepStatus('in_progress')).toBe('done');
    expect(nextPrepStatus('done')).toBe('todo');
  });

  it('adds up the week', () => {
    const summary = prepSummary([
      dish({ servings: 3, prepMinutes: 10, cookMinutes: 20, prepStatus: 'done' }),
      dish({ servings: 2 }),
    ]);
    expect(summary).toEqual({ dishCount: 2, doneCount: 1, servings: 5, minutes: 30 });
  });

  it('formats cooking time', () => {
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(120)).toBe('2h');
    expect(formatMinutes(130)).toBe('2h 10m');
  });

  it('groups by day, in meal order', () => {
    const days = groupDishesByDay([
      dish({ id: 'dinner', date: '2026-11-06' }),
      dish({ id: 'lunch', date: '2026-11-05', meal: 'lunch' }),
      dish({ id: 'breakfast', date: '2026-11-05', meal: 'breakfast' }),
    ]);
    expect(days.map((day) => day.date)).toEqual(['2026-11-05', '2026-11-06']);
    expect(days[0].dishes.map((d) => d.id)).toEqual(['breakfast', 'lunch']);
  });

  it('tells the cook when to scale a recipe', () => {
    expect(servingsNote(dish({ servings: 3, baseServings: 2 }))).toBe('Recipe makes 2, you need 3');
    expect(servingsNote(dish({ servings: 2, baseServings: 2 }))).toBeNull();
    expect(servingsNote(dish({ servings: 2 }))).toBeNull();
  });
});

describe('shopping', () => {
  it('keeps what’s left to buy at the top', () => {
    expect(sortShoppingItems([item('rice', true), item('dal')]).map((i) => i.key)).toEqual(['dal', 'rice']);
  });

  it('counts what’s bought', () => {
    expect(shoppingProgress([item('a', true), item('b')])).toEqual({ total: 2, bought: 1 });
  });

  it('says who a line is for', () => {
    expect(shoppingItemDishes(item('rice'))).toBe('Curry (3)');
  });
});
