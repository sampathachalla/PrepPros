import type { DishOption, MealDayState } from '../types/calendar';

/** A timer past its end counts as over at once, without waiting for the next reload. */
export function isTimerRunning(day: MealDayState | undefined, nowMs: number): boolean {
  return day?.status === 'open' && !!day.votingEndsAt && new Date(day.votingEndsAt).getTime() > nowMs;
}

export function isDayFixed(day: MealDayState | undefined, nowMs: number): boolean {
  return day?.status === 'fixed' || (day?.status === 'open' && !isTimerRunning(day, nowMs));
}

/** What the person may do with a day. The server enforces all of this; this only decides what to show. */
export function dayPermissions(day: MealDayState | undefined, isAdmin: boolean, isPast: boolean, nowMs: number) {
  const running = isTimerRunning(day, nowMs);
  const fixed = isDayFixed(day, nowMs);
  return {
    canEditPlan: isAdmin && !isPast && !fixed,
    canSuggest: !isAdmin && !isPast && running,
    canAnswer: running,
    canDecide: isAdmin && running,
    canStartTimer: isAdmin && !isPast && !running,
    canEndTimer: isAdmin && running,
  };
}

/** e.g. "2d 4h left", "3h 12m left", "12m left", "45s left". */
export function formatTimeLeft(endsAt: string, nowMs: number): string {
  const totalSeconds = Math.max(0, Math.floor((new Date(endsAt).getTime() - nowMs) / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m left`;
  return `${totalSeconds}s left`;
}

export function filterDishOptions(options: DishOption[], query: string): DishOption[] {
  const normalized = query.trim().toLowerCase();
  return normalized ? options.filter((option) => option.name.toLowerCase().includes(normalized)) : options;
}
