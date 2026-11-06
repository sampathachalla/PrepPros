import { useEffect, useState } from 'react';
import { ApiError } from '@/app/shared/services/apiClient';
import { calendarService } from '../services/calendarService';
import type { DishOptions, MealCategory } from '../types/calendar';

const NO_OPTIONS: DishOptions = { recentlySaved: [], liked: [], suggested: [] };

/** Loads the three lists shown when picking a dish for a meal. */
export function useDishOptions(meal: MealCategory) {
  const [options, setOptions] = useState<DishOptions>(NO_OPTIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    calendarService
      .getDishOptions(meal)
      .then((loaded) => {
        if (!cancelled) setOptions(loaded);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof ApiError ? cause.message : 'Could not load dishes.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [meal]);

  return { options, isLoading, error };
}
