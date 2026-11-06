import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { CALENDAR_POLL_INTERVAL_MS } from '../../calendar/constants/calendar';
import { useCalendarStore } from '../../calendar/store/calendarStore';
import type { MealCategory } from '../../calendar/types/calendar';
import { addDays, getTodayDateKey, getWeekDays } from '../../calendar/utils/dateUtils';
import { canAdvanceWeekFrom } from '../../calendar/utils/planningHorizonUtils';
import { useHouseholdStore } from '../../household/store/householdStore';
import { firstDayOfNextWeek, waitingSuggestions } from '../utils/planUtils';

/** The week being planned: which day is open, and keeping it loaded. Who may do what is up to the page. */
export function useWeekPlan() {
  const router = useRouter();
  const { date: requestedDate, meal: requestedMeal } = useLocalSearchParams<{ date?: string; meal?: MealCategory }>();
  const householdId = useHouseholdStore((s) => s.household?.id);
  const dishesByDate = useCalendarStore((s) => s.dishesByDate);
  const loadRange = useCalendarStore((s) => s.loadRange);

  const [date, setDate] = useState(() => firstDayOfNextWeek(getTodayDateKey()));
  const [openMeal, setOpenMeal] = useState<MealCategory | null>(null);

  // Arriving from a meal on the Calendar opens that day and meal; the params are then cleared so the
  // same meal can be opened again
  useEffect(() => {
    if (!requestedDate) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- route params are a one-off request from outside
    setDate(requestedDate);
    setOpenMeal(requestedMeal ?? null);
    router.setParams({ date: undefined, meal: undefined });
  }, [requestedDate, requestedMeal, router]);

  const weekDays = useMemo(() => getWeekDays(date, date), [date]);
  const weekDates = useMemo(() => weekDays.map((day) => day.dateString), [weekDays]);
  const suggestions = useMemo(() => waitingSuggestions(dishesByDate, weekDates), [dishesByDate, weekDates]);

  // The week before is loaded too, for copying last week's picks
  const firstLoaded = addDays(weekDates[0], -7);
  const lastLoaded = addDays(weekDates[6], 7);

  useFocusEffect(
    useCallback(() => {
      if (!householdId) return undefined;
      const refresh = () => void loadRange(firstLoaded, lastLoaded);
      refresh();
      const timer = setInterval(() => {
        if (AppState.currentState === 'active') refresh();
      }, CALENDAR_POLL_INTERVAL_MS);
      return () => clearInterval(timer);
    }, [householdId, firstLoaded, lastLoaded, loadRange]),
  );

  return {
    date,
    selectDate: setDate,
    weekDays,
    weekDates,
    suggestions,
    goToPreviousWeek: () => setDate((current) => addDays(current, -7)),
    goToNextWeek: () => setDate((current) => (canAdvanceWeekFrom(current) ? addDays(current, 7) : current)),
    canGoToNextWeek: canAdvanceWeekFrom(date),
    openMeal,
    setOpenMeal,
  };
}
