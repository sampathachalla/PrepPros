import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { ApiError } from '@/app/shared/services/apiClient';
import { haptics } from '@/app/shared/services/haptics';
import { useMealPlannerStore } from '../store/mealPlannerStore';
import type { SlotCoord, SlotPolicyStatus } from '../types/mealPlanner.types';
import { buildAllWeekSlotCoords, toggleSlotInList, toSlotKey } from '../utils/mealPlanner.utils';

export function useWeeklySlots() {
  const weekStart = useMealPlannerStore((s) => s.weekStart);
  const weekMeta = useMealPlannerStore((s) => s.weekMeta);
  const slotsByKey = useMealPlannerStore((s) => s.slotsByKey);
  const isSaving = useMealPlannerStore((s) => s.isSaving);
  const updateSlotPolicies = useMealPlannerStore((s) => s.updateSlotPolicies);

  const [targetPolicy, setTargetPolicy] = useState<SlotPolicyStatus>('reserved');
  const [selectedSlots, setSelectedSlots] = useState<SlotCoord[]>([]);

  const allSlotCoords = useMemo(() => buildAllWeekSlotCoords(weekStart), [weekStart]);

  const counts = useMemo(() => {
    let reserved = 0;
    let available = 0;
    for (const coord of allSlotCoords) {
      const slot = slotsByKey[toSlotKey(coord)];
      if (slot?.policy === 'reserved') reserved += 1;
      else available += 1;
    }
    return { reserved, available };
  }, [allSlotCoords, slotsByKey]);

  const affectedProposalSlotsCount = useMemo(() => {
    if (targetPolicy !== 'reserved') return 0;
    let count = 0;
    for (const coord of selectedSlots) {
      const slot = slotsByKey[toSlotKey(coord)];
      const hasProposals = (slot?.proposals ?? []).some((p) => p.dishes.length > 0);
      if (hasProposals) count += 1;
    }
    return count;
  }, [targetPolicy, selectedSlots, slotsByKey]);

  const toggleSlot = useCallback((coord: SlotCoord) => {
    setSelectedSlots((prev) => toggleSlotInList(prev, coord));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedSlots([]);
  }, []);

  const savePolicies = useCallback(
    (submissionDeadline?: string | null) => {
      if (selectedSlots.length === 0 && typeof submissionDeadline === 'undefined') return;

      const commitSave = async () => {
        try {
          await updateSlotPolicies({
            ...(typeof submissionDeadline !== 'undefined' ? { submissionDeadline } : {}),
            slots: selectedSlots.map((s) => ({
              date: s.date,
              meal: s.meal,
              status: targetPolicy,
            })),
          });
          setSelectedSlots([]);
          haptics.success();
        } catch (error) {
          haptics.error();
          Alert.alert(
            'Could not save slot availability',
            error instanceof ApiError ? error.message : 'Please try again.',
          );
        }
      };

      if (targetPolicy === 'reserved' && affectedProposalSlotsCount > 0) {
        Alert.alert(
          'Reserve slots with member choices?',
          `${affectedProposalSlotsCount} selected ${
            affectedProposalSlotsCount === 1 ? 'slot already has' : 'slots already have'
          } member meal proposals. Reserving will lock member editing while retaining their choices in history.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Reserve Slots', onPress: () => void commitSave() },
          ],
        );
      } else {
        void commitSave();
      }
    },
    [selectedSlots, targetPolicy, affectedProposalSlotsCount, updateSlotPolicies],
  );

  return {
    weekStart,
    weekMeta,
    slotsByKey,
    targetPolicy,
    setTargetPolicy,
    selectedSlots,
    counts,
    affectedProposalSlotsCount,
    isSaving,
    toggleSlot,
    clearSelection,
    savePolicies,
  };
}
