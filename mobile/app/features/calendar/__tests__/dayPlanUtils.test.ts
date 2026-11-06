import { dayPermissions, filterDishOptions, formatTimeLeft, isDayFixed, isTimerRunning } from '../utils/dayPlanUtils';
import type { MealDayState } from '../types/calendar';

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
