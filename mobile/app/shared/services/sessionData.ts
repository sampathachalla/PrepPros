import { useBookmarkStore } from '@/app/features/bookmarks/store/bookmarkStore';
import { useCalendarStore } from '@/app/features/calendar/store/calendarStore';
import { useHouseholdStore } from '@/app/features/household/store/householdStore';
import { useMealPrepStore } from '@/app/features/mealPrep/store/mealPrepStore';
import { useRecipeStore } from '@/app/features/recipes/store/recipeStore';

/** Forgets everything held for this person, so the next one to sign in sees none of it. */
export function clearSessionData() {
  useBookmarkStore.setState({ bookmarks: [], isLoading: true, loadError: null });
  useCalendarStore.getState().clear();
  useHouseholdStore.getState().clear();
  useMealPrepStore.getState().clear();
  useRecipeStore.getState().clear();
}
