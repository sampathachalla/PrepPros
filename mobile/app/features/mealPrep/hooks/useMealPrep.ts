import { useCallback, useMemo, useState } from 'react';
import { Alert, AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ApiError } from '@/app/shared/services/apiClient';
import { addDays, formatWeekTitle, getTodayDateKey, getWeekDays } from '../../calendar/utils/dateUtils';
import { useHouseholdStore } from '../../household/store/householdStore';
import { MEAL_PREP_POLL_INTERVAL_MS } from '../constants/mealPrep';
import { useMealPrepStore } from '../store/mealPrepStore';
import type { MealPrepView, PrepDish } from '../types/mealPrep';
import { groupDishesByDay, nextPrepStatus, prepSummary, shoppingProgress, sortShoppingItems } from '../utils/prepUtils';

const showError = (error: unknown) =>
  Alert.alert('That didn’t work', error instanceof ApiError ? error.message : 'Please try again.');

export function useMealPrep() {
  const plan = useMealPrepStore((state) => state.plan);
  const isLoading = useMealPrepStore((state) => state.isLoading);
  const loadError = useMealPrepStore((state) => state.loadError);
  const loadWeek = useMealPrepStore((state) => state.loadWeek);
  const household = useHouseholdStore((state) => state.household);
  const hasHousehold = household !== null;

  const [view, setView] = useState<MealPrepView>('cook');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [anchorDate, setAnchorDate] = useState(getTodayDateKey);

  const days = useMemo(() => getWeekDays(anchorDate, anchorDate), [anchorDate]);
  const weekStart = days[0].dateString;

  useFocusEffect(
    useCallback(() => {
      if (!hasHousehold) return undefined;
      void loadWeek(weekStart);
      const timer = setInterval(() => {
        if (AppState.currentState === 'active') void loadWeek(weekStart);
      }, MEAL_PREP_POLL_INTERVAL_MS);
      return () => clearInterval(timer);
    }, [hasHousehold, loadWeek, weekStart]),
  );

  const showingWeek = plan?.weekStart === weekStart ? plan : null;
  const dishes = useMemo(() => showingWeek?.dishes ?? [], [showingWeek]);
  const shopping = useMemo(() => sortShoppingItems(showingWeek?.shopping ?? []), [showingWeek]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadWeek(weekStart);
    setIsRefreshing(false);
  }, [loadWeek, weekStart]);

  const toggleStatus = useCallback((dish: PrepDish) => {
    useMealPrepStore.getState().setPrepStatus(dish.id, nextPrepStatus(dish.prepStatus)).catch(showError);
  }, []);

  /** Claims a dish, or lets it go if it's already yours. */
  const toggleCook = useCallback(
    (dish: PrepDish) => {
      const myId = household?.myId;
      if (!myId) return;
      const nextCook = dish.assigneeId === myId ? null : myId;
      useMealPrepStore.getState().assignCook(dish.id, nextCook).catch(showError);
    },
    [household?.myId],
  );

  const toggleShoppingItem = useCallback((key: string) => {
    useMealPrepStore.getState().toggleShoppingItem(key).catch(showError);
  }, []);

  return {
    hasHousehold,
    members: household?.members ?? [],
    myId: household?.myId,
    title: formatWeekTitle(days),
    view,
    setView,
    goToPreviousWeek: () => setAnchorDate((date) => addDays(date, -7)),
    goToNextWeek: () => setAnchorDate((date) => addDays(date, 7)),
    isLoading: isLoading || (!showingWeek && !loadError),
    loadError,
    isRefreshing,
    refresh,
    days: groupDishesByDay(dishes),
    summary: prepSummary(dishes),
    shopping,
    shoppingProgress: shoppingProgress(shopping),
    fixedDayCount: showingWeek?.fixedDayCount ?? 0,
    undecidedDayCount: showingWeek?.undecidedDayCount ?? 0,
    toggleStatus,
    toggleCook,
    toggleShoppingItem,
  };
}
