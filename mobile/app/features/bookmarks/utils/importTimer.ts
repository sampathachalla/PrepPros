const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** What a processing card says, given the average wait and how long this import has waited so far. */
export function importTimerLabel(averageSeconds: number, elapsedSeconds: number): string {
  const remaining = averageSeconds - elapsedSeconds;
  if (remaining <= 0) return `Taking longer than usual (avg ${clock(averageSeconds)})`;
  return `About ${clock(remaining)} left (avg ${clock(averageSeconds)})`;
}
