import { getWeekDays } from '../utils/dateUtils';

describe('getWeekDays', () => {
  const weekOf = (date: string) => getWeekDays(date, date).map((day) => day.dateString);

  it('starts on Sunday and ends on Saturday', () => {
    const days = getWeekDays('2026-11-04', '2026-11-04');
    expect(days.map((day) => day.dayName)).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    expect(days[0].dateString).toBe('2026-11-01');
    expect(days[6].dateString).toBe('2026-11-07');
  });

  it('gives the same week for its Sunday, a midweek day and its Saturday', () => {
    expect(weekOf('2026-11-01')).toEqual(weekOf('2026-11-04'));
    expect(weekOf('2026-11-07')).toEqual(weekOf('2026-11-04'));
  });

  it('runs across a month boundary', () => {
    expect(weekOf('2026-10-31')[0]).toBe('2026-10-25');
    expect(weekOf('2026-10-31')[6]).toBe('2026-10-31');
    expect(weekOf('2026-11-29')[6]).toBe('2026-12-05');
  });

  it('marks whichever day it is told is today, so the highlight can move at midnight', () => {
    const days = getWeekDays('2026-11-04', '2026-11-04', '2026-11-05');
    expect(days.filter((day) => day.isToday).map((day) => day.dateString)).toEqual(['2026-11-05']);
  });

  it('marks the selected day', () => {
    const days = getWeekDays('2026-11-04', '2026-11-06');
    expect(days.filter((day) => day.isSelected).map((day) => day.dateString)).toEqual(['2026-11-06']);
  });
});
