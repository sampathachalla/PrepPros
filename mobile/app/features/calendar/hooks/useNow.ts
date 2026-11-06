import { useEffect, useState } from 'react';
import { useCalendarStore } from '../store/calendarStore';

/** The current time on the server's clock, updated while the screen is showing. */
export function useNow(intervalMs = 30_000): number {
  const clockOffsetMs = useCalendarStore((state) => state.clockOffsetMs);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now + clockOffsetMs;
}
