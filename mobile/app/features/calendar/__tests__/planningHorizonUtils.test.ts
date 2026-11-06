import { MAX_WEEKS_AHEAD_OF_TODAY } from '../constants/calendar';
import {
  canAdvanceWeekFrom,
  weeksAheadOfToday } from '../utils/planningHorizonUtils';
import { addDays, getTodayDateKey } from '../utils/dateUtils';

describe('planningHorizonUtils', () => {
  it('allows advancing until MAX_WEEKS_AHEAD', () => {
    const today = getTodayDateKey();
    expect(weeksAheadOfToday(today)).toBe(0);
    expect(canAdvanceWeekFrom(today)).toBe(true);

    let anchor = today;
    for (let i = 0; i < MAX_WEEKS_AHEAD_OF_TODAY; i += 1) {
      expect(canAdvanceWeekFrom(anchor)).toBe(true);
      anchor = addDays(anchor, 7);
    }
    expect(canAdvanceWeekFrom(anchor)).toBe(false);
  });
});
