import { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { ApiError } from '@/app/shared/services/apiClient';
import { haptics } from '@/app/shared/services/haptics';
import { selectIsHouseholdAdmin, useHouseholdStore } from '../../household/store/householdStore';
import { useMealPlannerStore } from '../store/mealPlannerStore';
import type { CatalogDish, SlotCoord } from '../types/mealPlanner.types';
import { doesUserHaveDishInSlot, toSlotKey } from '../utils/mealPlanner.utils';

export function useDishSelections(dish: CatalogDish | null) {
  const myId = useHouseholdStore((s) => s.household?.myId) ?? '';
  const isAdmin = useHouseholdStore(selectIsHouseholdAdmin);

  const weekStart = useMealPlannerStore((s) => s.weekStart);
  const weekMeta = useMealPlannerStore((s) => s.weekMeta);
  const mySubmission = useMealPlannerStore((s) => s.mySubmission);
  const slotsByKey = useMealPlannerStore((s) => s.slotsByKey);
  const isSaving = useMealPlannerStore((s) => s.isSaving);
  const bufferedDishSlots = useMealPlannerStore((s) => s.bufferedDishSlots);

  const toggleBufferedSlot = useMealPlannerStore((s) => s.toggleBufferedSlot);
  const clearBufferedSlots = useMealPlannerStore((s) => s.clearBufferedSlots);
  const saveDishSelections = useMealPlannerStore((s) => s.saveDishSelections);

  const dishKey = dish?.dishKey ?? '';
  const selectedSlots = useMemo(() => {
    if (!dishKey) return [];
    return bufferedDishSlots[`${weekStart}::${dishKey}`] ?? [];
  }, [bufferedDishSlots, weekStart, dishKey]);

  const isLockedForMember =
    !isAdmin && (Boolean(weekMeta?.isDeadlinePassed) || mySubmission.status === 'locked');

  const existingDishSlots = useMemo(() => {
    if (!dishKey) return [];
    const list: SlotCoord[] = [];
    for (const slot of Object.values(slotsByKey)) {
      if (doesUserHaveDishInSlot(slot, myId, dishKey)) {
        list.push({ date: slot.date, meal: slot.meal });
      }
    }
    return list;
  }, [slotsByKey, myId, dishKey]);

  const toggleSlot = useCallback(
    (coord: SlotCoord) => {
      if (!dish || isLockedForMember) return;
      const slot = slotsByKey[toSlotKey(coord)];
      if (slot?.policy === 'reserved' && !isAdmin) return;
      toggleBufferedSlot(weekStart, dish.dishKey, coord);
    },
    [dish, isLockedForMember, slotsByKey, isAdmin, toggleBufferedSlot, weekStart],
  );

  const confirmAddSlots = useCallback(
    async (slotsToAdd: SlotCoord[]) => {
      if (!dish || slotsToAdd.length === 0) return false;
      try {
        await saveDishSelections({
          dish: {
            dishKey: dish.dishKey,
            recipeId: dish.recipeId ?? null,
            bookmarkId: dish.bookmarkId ?? null,
            fromDishId: dish.fromDishId ?? null,
            name: dish.name,
            imageUrl: dish.imageUrl,
            minutes: dish.minutes,
          },
          addSlots: slotsToAdd,
          removeSlots: [],
        });
        haptics.success();
        return true;
      } catch (error) {
        haptics.error();
        Alert.alert(
          'Could not save slots',
          error instanceof ApiError ? error.message : 'Please try again.',
        );
        return false;
      }
    },
    [dish, saveDishSelections],
  );

  const removeDishFromSlot = useCallback(
    async (slotToRemove: SlotCoord) => {
      if (!dish) return false;
      try {
        await saveDishSelections({
          dish: {
            dishKey: dish.dishKey,
            recipeId: dish.recipeId ?? null,
            bookmarkId: dish.bookmarkId ?? null,
            fromDishId: dish.fromDishId ?? null,
            name: dish.name,
            imageUrl: dish.imageUrl,
            minutes: dish.minutes,
          },
          addSlots: [],
          removeSlots: [slotToRemove],
        });
        haptics.selection();
        return true;
      } catch (error) {
        haptics.error();
        Alert.alert(
          'Could not remove dish',
          error instanceof ApiError ? error.message : 'Please try again.',
        );
        return false;
      }
    },
    [dish, saveDishSelections],
  );

  const clearSelection = useCallback(() => {
    if (!dishKey) return;
    clearBufferedSlots(weekStart, dishKey);
  }, [clearBufferedSlots, weekStart, dishKey]);

  return {
    selectedSlots,
    existingDishSlots,
    isLockedForMember,
    isSaving,
    toggleSlot,
    confirmAddSlots,
    removeDishFromSlot,
    clearSelection,
  };
}
