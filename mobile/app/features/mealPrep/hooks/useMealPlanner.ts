import { useEffect, useMemo } from 'react';
import { formatWeekTitle, getWeekDays } from '../../calendar/utils/dateUtils';
import { selectIsHouseholdAdmin, useHouseholdStore } from '../../household/store/householdStore';
import { useMealPlannerStore } from '../store/mealPlannerStore';
import { doesUserHaveDishInSlot, filterCatalogDishes } from '../utils/mealPlanner.utils';

export function useMealPlanner() {
  const hasHousehold = useHouseholdStore((s) => s.household !== null);
  const members = useHouseholdStore((s) => s.household?.members) ?? [];
  const myId = useHouseholdStore((s) => s.household?.myId) ?? '';
  const isAdmin = useHouseholdStore(selectIsHouseholdAdmin);

  const weekStart = useMealPlannerStore((s) => s.weekStart);
  const activeScreen = useMealPlannerStore((s) => s.activeScreen);
  const activeDish = useMealPlannerStore((s) => s.activeDish);
  const activeSlot = useMealPlannerStore((s) => s.activeSlot);
  const catalogFilter = useMealPlannerStore((s) => s.catalogFilter);
  const searchQuery = useMealPlannerStore((s) => s.searchQuery);
  const catalogDishes = useMealPlannerStore((s) => s.catalogDishes);
  const isCatalogLoading = useMealPlannerStore((s) => s.isCatalogLoading);
  const catalogError = useMealPlannerStore((s) => s.catalogError);
  const weekMeta = useMealPlannerStore((s) => s.weekMeta);
  const mySubmission = useMealPlannerStore((s) => s.mySubmission);
  const memberSubmissions = useMealPlannerStore((s) => s.memberSubmissions);
  const slotsByKey = useMealPlannerStore((s) => s.slotsByKey);
  const isWeekLoading = useMealPlannerStore((s) => s.isWeekLoading);
  const isSaving = useMealPlannerStore((s) => s.isSaving);
  const weekError = useMealPlannerStore((s) => s.weekError);

  const shiftWeek = useMealPlannerStore((s) => s.shiftWeek);
  const navigateTo = useMealPlannerStore((s) => s.navigateTo);
  const setCatalogFilter = useMealPlannerStore((s) => s.setCatalogFilter);
  const setSearchQuery = useMealPlannerStore((s) => s.setSearchQuery);
  const loadCatalog = useMealPlannerStore((s) => s.loadCatalog);
  const loadWeekPlan = useMealPlannerStore((s) => s.loadWeekPlan);
  const refreshAll = useMealPlannerStore((s) => s.refreshAll);

  useEffect(() => {
    if (!hasHousehold) return;
    void loadCatalog(weekStart);
    void loadWeekPlan(weekStart);
  }, [hasHousehold, weekStart, loadCatalog, loadWeekPlan]);

  const weekDays = useMemo(() => getWeekDays(weekStart, weekStart), [weekStart]);
  const weekTitle = useMemo(() => formatWeekTitle(weekDays), [weekDays]);

  const filteredDishes = useMemo(
    () => filterCatalogDishes(catalogDishes, catalogFilter, searchQuery),
    [catalogDishes, catalogFilter, searchQuery],
  );

  const assignedCountByDishKey = useMemo(() => {
    const counts: Record<string, number> = {};
    const slotList = Object.values(slotsByKey);
    for (const dish of catalogDishes) {
      let count = 0;
      for (const slot of slotList) {
        if (doesUserHaveDishInSlot(slot, myId, dish.dishKey)) {
          count += 1;
        }
      }
      if (count > 0) counts[dish.dishKey] = count;
    }
    return counts;
  }, [catalogDishes, slotsByKey, myId]);

  const myPlannedSlotCount = useMemo(() => {
    let count = 0;
    for (const slot of Object.values(slotsByKey)) {
      const hasChoice =
        Boolean(slot.myChoiceProposalId) ||
        slot.proposals.some((p) => p.participantMemberIds.includes(myId) && p.dishes.length > 0);
      if (hasChoice) count += 1;
    }
    return count;
  }, [slotsByKey, myId]);

  return {
    hasHousehold,
    members,
    myId,
    isAdmin,
    weekStart,
    weekTitle,
    activeScreen,
    activeDish,
    activeSlot,
    catalogFilter,
    searchQuery,
    dishes: filteredDishes,
    allCatalogDishes: catalogDishes,
    assignedCountByDishKey,
    myPlannedSlotCount,
    isCatalogLoading,
    catalogError,
    weekMeta,
    mySubmission,
    memberSubmissions,
    slotsByKey,
    isWeekLoading,
    isSaving,
    weekError,
    shiftWeek,
    navigateTo,
    setCatalogFilter,
    setSearchQuery,
    refreshAll,
  };
}
