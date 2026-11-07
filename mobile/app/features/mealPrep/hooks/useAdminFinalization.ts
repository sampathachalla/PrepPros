import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { ApiError } from '@/app/shared/services/apiClient';
import { haptics } from '@/app/shared/services/haptics';
import { useHouseholdStore } from '../../household/store/householdStore';
import { useMealPlannerStore } from '../store/mealPlannerStore';
import type {
  BulkAssignStrategy,
  CatalogDish,
  ProposalDishItem,
  SlotCoord,
} from '../types/mealPlanner.types';
import {
  buildAllWeekSlotCoords,
  computeBulkAssignPreview,
  toggleSlotInList,
  toSlotKey,
} from '../utils/mealPlanner.utils';

export type AdminFinalizeViewMode = 'bulk-grid' | 'daily-review';

export function useAdminFinalization() {
  const members = useHouseholdStore((s) => s.household?.members) ?? [];
  const myId = useHouseholdStore((s) => s.household?.myId) ?? '';

  const weekStart = useMealPlannerStore((s) => s.weekStart);
  const weekMeta = useMealPlannerStore((s) => s.weekMeta);
  const slotsByKey = useMealPlannerStore((s) => s.slotsByKey);
  const catalogDishes = useMealPlannerStore((s) => s.catalogDishes);
  const isSaving = useMealPlannerStore((s) => s.isSaving);

  const bulkAssignDraft = useMealPlannerStore((s) => s.bulkAssignDraft);
  const updateSlotDraft = useMealPlannerStore((s) => s.updateSlotDraft);
  const publishWeeklyMenu = useMealPlannerStore((s) => s.publishWeeklyMenu);

  const [viewMode, setViewMode] = useState<AdminFinalizeViewMode>('bulk-grid');
  const [selectedSlots, setSelectedSlots] = useState<SlotCoord[]>([]);
  const [strategy, setStrategy] = useState<BulkAssignStrategy>('member_complete');
  const [sourceMemberIds, setSourceMemberIds] = useState<string[]>(() =>
    members[0]?.id ? [members[0].id] : myId ? [myId] : [],
  );
  const [editingSlot, setEditingSlot] = useState<SlotCoord | null>(null);

  const effectiveSourceMemberIds = useMemo(() => {
    if (sourceMemberIds.length > 0) return sourceMemberIds;
    if (members[0]?.id) return [members[0].id];
    return myId ? [myId] : [];
  }, [sourceMemberIds, members, myId]);

  const preview = useMemo(
    () =>
      computeBulkAssignPreview(
        slotsByKey,
        selectedSlots,
        strategy,
        effectiveSourceMemberIds,
        members,
      ),
    [slotsByKey, selectedSlots, strategy, effectiveSourceMemberIds, members],
  );

  const weekHealth = useMemo(() => {
    const allCoords = buildAllWeekSlotCoords(weekStart);
    let emptyCount = 0;
    let needsReviewCount = 0;
    let readyCount = 0;
    let emptyReservedCount = 0;

    for (const coord of allCoords) {
      const slot = slotsByKey[toSlotKey(coord)];
      const dishCount = slot?.adminDraft.dishes.length ?? 0;
      const status = slot?.adminDraft.status ?? 'empty';
      if (dishCount === 0) {
        emptyCount += 1;
        if (slot?.policy === 'reserved') emptyReservedCount += 1;
      } else if (status === 'needs_review') {
        needsReviewCount += 1;
      } else {
        readyCount += 1;
      }
    }

    return { emptyCount, needsReviewCount, readyCount, emptyReservedCount };
  }, [weekStart, slotsByKey]);

  const toggleSlot = useCallback((coord: SlotCoord) => {
    setSelectedSlots((prev) => toggleSlotInList(prev, coord));
  }, []);

  const selectAllSlots = useCallback(() => {
    const all = buildAllWeekSlotCoords(weekStart);
    setSelectedSlots((prev) => (prev.length === all.length ? [] : all));
  }, [weekStart]);

  const toggleSourceMember = useCallback(
    (memberId: string) => {
      if (strategy === 'member_complete') {
        setSourceMemberIds([memberId]);
        return;
      }
      setSourceMemberIds((prev) =>
        prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId],
      );
    },
    [strategy],
  );

  const applyBulkAssignment = useCallback(() => {
    if (selectedSlots.length === 0) return;

    const summaryLines = [
      `• Selected slots: ${preview.selectedCount}`,
      `• Slots populated: ${preview.populatedCount}`,
      `• Slots left empty: ${preview.emptyCount}`,
      preview.needsReviewCount > 0
        ? `• Flagged for review: ${preview.needsReviewCount} (verify in Daily Review)`
        : null,
    ].filter(Boolean);

    Alert.alert('Apply to Weekly Menu Draft?', summaryLines.join('\n'), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Apply to Draft',
        onPress: () => {
          void (async () => {
            try {
              await bulkAssignDraft({
                dryRun: false,
                slots: selectedSlots,
                strategy,
                sourceMemberIds: effectiveSourceMemberIds,
              });
              setSelectedSlots([]);
              haptics.success();
            } catch (error) {
              haptics.error();
              Alert.alert(
                'Bulk assignment failed',
                error instanceof ApiError ? error.message : 'Please try again.',
              );
            }
          })();
        },
      },
    ]);
  }, [selectedSlots, preview, bulkAssignDraft, strategy, effectiveSourceMemberIds]);

  const toggleDishInEditingSlot = useCallback(
    async (dish: CatalogDish) => {
      if (!editingSlot) return;
      const slot = slotsByKey[toSlotKey(editingSlot)];
      const currentDishes = slot?.adminDraft.dishes ?? [];
      const exists = currentDishes.some(
        (d) => d.dishKey === dish.dishKey || d.name.toLowerCase() === dish.name.toLowerCase(),
      );

      const nextDishes: ProposalDishItem[] = exists
        ? currentDishes.filter(
            (d) => d.dishKey !== dish.dishKey && d.name.toLowerCase() !== dish.name.toLowerCase(),
          )
        : [
            ...currentDishes,
            {
              dishKey: dish.dishKey,
              name: dish.name,
              imageUrl: dish.imageUrl,
              recipeId: dish.recipeId ?? null,
              bookmarkId: dish.bookmarkId ?? null,
              prepMinutes: dish.minutes,
              ingredients: dish.ingredients,
              steps: dish.steps,
            },
          ];

      try {
        await updateSlotDraft(editingSlot.date, editingSlot.meal, nextDishes, 'Admin edited');
        haptics.selection();
      } catch (error) {
        haptics.error();
        Alert.alert(
          'Could not update slot',
          error instanceof ApiError ? error.message : 'Please try again.',
        );
      }
    },
    [editingSlot, slotsByKey, updateSlotDraft],
  );

  const publishMenu = useCallback(
    (onPublished?: () => void) => {
      const { emptyCount, needsReviewCount, emptyReservedCount } = weekHealth;

      const executePublish = async (allowIncomplete: boolean) => {
        try {
          await publishWeeklyMenu(allowIncomplete);
          haptics.success();
          Alert.alert(
            'Weekly Menu Published',
            'The household Calendar now displays this finalized weekly menu.',
          );
          onPublished?.();
        } catch (error) {
          haptics.error();
          Alert.alert(
            'Could not publish menu',
            error instanceof ApiError ? error.message : 'Please try again.',
          );
        }
      };

      if (emptyCount > 0 || needsReviewCount > 0 || emptyReservedCount > 0) {
        const warnings = [
          emptyCount > 0 ? `• ${emptyCount} meal slot(s) are still empty` : null,
          emptyReservedCount > 0 ? `• ${emptyReservedCount} reserved slot(s) have no dishes` : null,
          needsReviewCount > 0 ? `• ${needsReviewCount} combined slot(s) are flagged Needs Review` : null,
        ].filter(Boolean);

        Alert.alert(
          'Publish with incomplete slots?',
          `${warnings.join('\n')}\n\nPublishing updates the Calendar for all household members.`,
          [
            { text: 'Review First', style: 'cancel' },
            { text: 'Publish Anyway', onPress: () => void executePublish(true) },
          ],
        );
      } else {
        void executePublish(true);
      }
    },
    [weekHealth, publishWeeklyMenu],
  );

  return {
    members,
    weekStart,
    weekMeta,
    slotsByKey,
    catalogDishes,
    viewMode,
    setViewMode,
    selectedSlots,
    strategy,
    setStrategy,
    sourceMemberIds: effectiveSourceMemberIds,
    toggleSourceMember,
    preview,
    weekHealth,
    editingSlot,
    setEditingSlot,
    isSaving,
    toggleSlot,
    selectAllSlots,
    applyBulkAssignment,
    toggleDishInEditingSlot,
    publishMenu,
  };
}
