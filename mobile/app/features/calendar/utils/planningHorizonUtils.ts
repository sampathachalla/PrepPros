import { MAX_WEEKS_AHEAD_OF_TODAY } from '../constants/calendar';
import { addDays, getTodayDateKey, getWeekDays, parseDateKey } from './dateUtils';

export function getWeekStartKey(dateStr: string): string {
  return getWeekDays(dateStr, dateStr)[0].dateString;
}

/** Whole weeks after the current week (this week = 0). */
export function weeksAheadOfToday(dateStr: string): number {
  const todayWeekStart = getWeekStartKey(getTodayDateKey());
  const targetWeekStart = getWeekStartKey(dateStr);
  const diffMs =
    parseDateKey(targetWeekStart).getTime() - parseDateKey(todayWeekStart).getTime();
  return Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
}

/** Meal planning allowed from the past through {MAX} weeks ahead. */
export function isPlanningEditable(dateStr: string): boolean {
  return weeksAheadOfToday(dateStr) <= MAX_WEEKS_AHEAD_OF_TODAY;
}

export function isBeyondPlanningHorizon(dateStr: string): boolean {
  return weeksAheadOfToday(dateStr) > MAX_WEEKS_AHEAD_OF_TODAY;
}

/** Whether the UI may show the next week (swipe / chevron). */
export function canAdvanceWeekFrom(anchorDateStr: string): boolean {
  const nextWeekStart = addDays(getWeekStartKey(anchorDateStr), 7);
  return weeksAheadOfToday(nextWeekStart) <= MAX_WEEKS_AHEAD_OF_TODAY;
}

/** Whether the UI may show the previous week (swipe / chevron). */
export function canRetreatWeekFrom(anchorDateStr: string): boolean {
  const prevWeekStart = addDays(getWeekStartKey(anchorDateStr), -7);
  return weeksAheadOfToday(prevWeekStart) >= -MAX_WEEKS_AHEAD_OF_TODAY;
}
