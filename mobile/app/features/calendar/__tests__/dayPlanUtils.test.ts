import {
  buildPickerSections,
  dayPermissions,
  filterDishOptions,
  formatTimeLeft,
  isDayFixed,
  isTimerRunning,
} from '../utils/dayPlanUtils';
import type { DishOption, DishOptions, MealDayState, ScheduledDish } from '../types/calendar';

const NOW = new Date('2026-11-04T12:00:00.000Z').getTime();
const open: MealDayState = { date: '2026-11-05', status: 'open', votingEndsAt: new Date(NOW + 60_000).toISOString() };
const expired: MealDayState = { ...open, votingEndsAt: new Date(NOW - 1).toISOString() };
const fixed: MealDayState = { date: '2026-11-05', status: 'fixed' };
const draft: MealDayState = { date: '2026-11-05', status: 'draft' };

describe('day state', () => {
  it('treats a timer past its end as fixed straight away', () => {
    expect(isTimerRunning(open, NOW)).toBe(true);
    expect(isTimerRunning(expired, NOW)).toBe(false);
    expect(isDayFixed(expired, NOW)).toBe(true);
  });
});

describe('dayPermissions', () => {
  it('lets the admin plan a draft and members pick for it, but nobody answer it', () => {
    expect(dayPermissions(draft, true, false, NOW)).toMatchObject({ canEditPlan: true, canStartTimer: true, canDecide: true, canAnswer: false });
    expect(dayPermissions(draft, false, false, NOW)).toMatchObject({ canEditPlan: false, canSuggest: true, canAnswer: false });
    expect(dayPermissions(undefined, true, false, NOW)).toMatchObject({ canEditPlan: true });
  });

  it('while the timer runs, members accept or suggest and the admin decides', () => {
    expect(dayPermissions(open, false, false, NOW)).toMatchObject({ canAnswer: true, canSuggest: true, canDecide: false, canEditPlan: false });
    expect(dayPermissions(open, true, false, NOW)).toMatchObject({ canAnswer: true, canDecide: true, canEndTimer: true, canSuggest: false });
  });

  it('a fixed day is closed, though the admin can reopen it', () => {
    expect(dayPermissions(fixed, false, false, NOW)).toMatchObject({ canAnswer: false, canSuggest: false });
    expect(dayPermissions(fixed, true, false, NOW)).toMatchObject({ canDecide: false });
    expect(dayPermissions(fixed, true, false, NOW)).toMatchObject({ canEditPlan: false, canStartTimer: true });
  });

  it('nothing changes on a past day', () => {
    expect(dayPermissions(fixed, true, true, NOW)).toMatchObject({ canEditPlan: false, canStartTimer: false });
  });
});

describe('labels', () => {
  const at = (ms: number) => new Date(NOW + ms).toISOString();

  it('formats the time left', () => {
    expect(formatTimeLeft(at(2 * 86_400_000 + 4 * 3_600_000), NOW)).toBe('2d 4h left');
    expect(formatTimeLeft(at(3 * 3_600_000 + 12 * 60_000), NOW)).toBe('3h 12m left');
    expect(formatTimeLeft(at(12 * 60_000), NOW)).toBe('12m left');
    expect(formatTimeLeft(at(45_000), NOW)).toBe('45s left');
    expect(formatTimeLeft(at(-5000), NOW)).toBe('0s left');
  });
});

describe('filterDishOptions', () => {
  it('searches names, ignoring case', () => {
    const options = [
      { key: 'a', name: 'Chicken Curry' },
      { key: 'b', name: 'Dal' },
    ];
    expect(filterDishOptions(options, ' CURRY ').map((o) => o.key)).toEqual(['a']);
    expect(filterDishOptions(options, '')).toHaveLength(2);
  });
});

describe('buildPickerSections', () => {
  const NO_OPTIONS: DishOptions = { recentlySaved: [], liked: [], suggested: [] };
  const option = (key: string, name: string): DishOption => ({ key, name });
  const dish = (id: string, overrides: Partial<ScheduledDish> = {}): ScheduledDish => ({
    id,
    name: `Dish ${id}`,
    category: 'dinner',
    date: '2026-11-05',
    isSuggestion: false,
    status: 'approved',
    memberIds: [],
    createdAt: '2026-11-01T00:00:00.000Z',
    ...overrides,
  });
  const itemState = (planned: ScheduledDish, canAnswer: boolean) =>
    buildPickerSections({ options: NO_OPTIONS, householdDishes: [planned], myId: 'me', canAnswer })[0].items[0].state;

  it('orders the sections and leaves out empty ones', () => {
    const sections = buildPickerSections({
      options: {
        liked: [option('a', 'Curry')],
        recentlySaved: [option('b', 'Soup')],
        suggested: [option('c', 'Salad')],
      },
      householdDishes: [dish('1')],
    });
    expect(sections.map(({ key }) => key)).toEqual(['household', 'liked', 'new', 'possible']);

    const onlyLiked = buildPickerSections({ options: { ...NO_OPTIONS, liked: [option('a', 'Curry')] } });
    expect(onlyLiked.map(({ key }) => key)).toEqual(['liked']);
  });

  it('shows a dish once, in the first section that has it', () => {
    const sections = buildPickerSections({
      options: {
        liked: [option('a', ' CURRY ')],
        recentlySaved: [option('a', 'Soup'), option('b', 'Salad')],
        suggested: [option('c', 'salad')],
      },
      householdDishes: [dish('1', { name: 'Curry' })],
    });
    expect(sections.map(({ key, items }) => [key, items.map(({ name }) => name)])).toEqual([
      ['household', ['Curry']],
      ['new', ['Salad']],
    ]);
  });

  it('leaves out declined dishes, so they can be suggested again', () => {
    const sections = buildPickerSections({
      options: { ...NO_OPTIONS, liked: [option('a', 'Curry')] },
      householdDishes: [dish('1', { name: 'Curry', status: 'declined' })],
    });
    expect(sections.map(({ key }) => key)).toEqual(['liked']);
    expect(sections[0].items[0].state).toBe('suggest');
  });

  it('gives every card the state that decides what a tap does', () => {
    expect(itemState(dish('1', { status: 'pending' }), true)).toBe('waiting');
    expect(itemState(dish('1'), false)).toBe('onPlan');
    expect(itemState(dish('1'), true)).toBe('select');
    expect(itemState(dish('1', { memberIds: ['me'] }), true)).toBe('selected');
  });

  it('shows the selected count on household cards', () => {
    const [section] = buildPickerSections({
      options: NO_OPTIONS,
      householdDishes: [dish('1', { memberIds: ['me', 'you'], prepMinutes: 5, cookMinutes: 10 })],
      memberCount: 4,
    });
    expect(section.items[0]).toMatchObject({ reason: '2 of 4', minutes: 15 });
  });
});
