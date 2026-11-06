import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useHouseholdStore } from '../../household/store/householdStore';
import { CALENDAR_POLL_INTERVAL_MS, TODAY_CHECK_INTERVAL_MS } from '../constants/calendar';
import { useCalendarStore } from '../store/calendarStore';
import { addDays, getTodayDateKey, getWeekDays } from '../utils/dateUtils';
import { canAdvanceWeekFrom } from '../utils/planningHorizonUtils';

export function useCalendar() {
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const setSelectedDate = useCalendarStore((s) => s.setSelectedDate);
  const loadError = useCalendarStore((s) => s.loadError);
  const loadRange = useCalendarStore((s) => s.loadRange);
  const householdId = useHouseholdStore((s) => s.household?.id);
  const [today, setToday] = useState(getTodayDateKey);

  // The app can stay open past midnight; someone watching today keeps watching today
  const syncToday = useCallback(() => {
    const now = getTodayDateKey();
    if (now === today) return;
    setToday(now);
    if (selectedDate === today) setSelectedDate(now);
  }, [today, selectedDate, setSelectedDate]);

  useFocusEffect(
    useCallback(() => {
      syncToday();
      const timer = setInterval(syncToday, TODAY_CHECK_INTERVAL_MS);
      const subscription = AppState.addEventListener('change', (status) => {
        if (status === 'active') syncToday();
      });
      return () => {
        clearInterval(timer);
        subscription.remove();
      };
    }, [syncToday]),
  );

  // The week on screen is always the one holding the selected day
  const weekDays = useMemo(() => getWeekDays(selectedDate, selectedDate, today), [selectedDate, today]);
  const canGoToNextWeek = useMemo(() => canAdvanceWeekFrom(selectedDate), [selectedDate]);

  const goToPrevious = useCallback(() => setSelectedDate(addDays(selectedDate, -7)), [selectedDate, setSelectedDate]);

  const goToNext = useCallback(() => {
    if (canAdvanceWeekFrom(selectedDate)) setSelectedDate(addDays(selectedDate, 7));
  }, [selectedDate, setSelectedDate]);

  // The week on screen and the ones either side, so swiping into a new week finds it already loaded.
  // Kept current so everyone sees each other's answers.
  const firstVisible = addDays(weekDays[0].dateString, -7);
  const lastVisible = addDays(weekDays[6].dateString, 7);

  useEffect(() => {
    if (householdId) void loadRange(firstVisible, lastVisible);
  }, [householdId, firstVisible, lastVisible, loadRange]);

  // After leaving a household, its plans must not stay on the calendar
  useEffect(() => {
    if (!householdId) useCalendarStore.getState().clear();
  }, [householdId]);

  useFocusEffect(
    useCallback(() => {
      if (!householdId) return undefined;
      const refresh = () => void loadRange(firstVisible, lastVisible);
      refresh();
      const timer = setInterval(() => {
        if (AppState.currentState === 'active') refresh();
      }, CALENDAR_POLL_INTERVAL_MS);
      const subscription = AppState.addEventListener('change', (status) => {
        if (status === 'active') refresh();
      });
      return () => {
        clearInterval(timer);
        subscription.remove();
      };
    }, [householdId, firstVisible, lastVisible, loadRange]),
  );

  return {
    selectedDate,
    weekDays,
    loadError,
    selectDate: setSelectedDate,
    goToPrevious,
    goToNext,
    canGoToNextWeek,
  };
}
