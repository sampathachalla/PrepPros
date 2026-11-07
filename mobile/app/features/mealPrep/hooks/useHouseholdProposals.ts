import { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { ApiError } from '@/app/shared/services/apiClient';
import { haptics } from '@/app/shared/services/haptics';
import { selectIsHouseholdAdmin, useHouseholdStore } from '../../household/store/householdStore';
import { useMealPlannerStore } from '../store/mealPlannerStore';
import type { MealProposal, SlotCoord } from '../types/mealPlanner.types';
import {
  findMemberActiveProposal,
  findMemberOwnProposal,
  toSlotKey,
} from '../utils/mealPlanner.utils';

export function useHouseholdProposals(slotCoord: SlotCoord | null) {
  const members = useHouseholdStore((s) => s.household?.members) ?? [];
  const myId = useHouseholdStore((s) => s.household?.myId) ?? '';
  const isAdmin = useHouseholdStore(selectIsHouseholdAdmin);

  const slotsByKey = useMealPlannerStore((s) => s.slotsByKey);
  const weekMeta = useMealPlannerStore((s) => s.weekMeta);
  const mySubmission = useMealPlannerStore((s) => s.mySubmission);
  const isSaving = useMealPlannerStore((s) => s.isSaving);
  const setSlotChoice = useMealPlannerStore((s) => s.setSlotChoice);

  const slot = useMemo(() => {
    if (!slotCoord) return undefined;
    return slotsByKey[toSlotKey(slotCoord)];
  }, [slotsByKey, slotCoord]);

  const proposals = useMemo(
    () => (slot?.proposals ?? []).filter((p) => p.dishes.length > 0),
    [slot],
  );

  const myOwnProposal = useMemo(() => findMemberOwnProposal(slot, myId), [slot, myId]);
  const myActiveProposal = useMemo(() => findMemberActiveProposal(slot, myId), [slot, myId]);

  const isReserved = slot?.policy === 'reserved';
  const isLocked =
    !isAdmin &&
    (isReserved || Boolean(weekMeta?.isDeadlinePassed) || mySubmission.status === 'locked');

  const joinProposal = useCallback(
    (targetProposal: MealProposal) => {
      if (!slotCoord || isLocked) return;

      const executeJoin = async () => {
        try {
          await setSlotChoice(slotCoord.date, slotCoord.meal, {
            mode: 'join_proposal',
            proposalId: targetProposal.id,
          });
          haptics.success();
        } catch (error) {
          haptics.error();
          Alert.alert(
            'Could not update choice',
            error instanceof ApiError ? error.message : 'Please try again.',
          );
        }
      };

      if (myActiveProposal && myActiveProposal.id !== targetProposal.id) {
        const proposer = members.find((m) => m.id === targetProposal.proposerId);
        Alert.alert(
          'Switch your meal choice?',
          `Joining ${proposer?.name ?? 'this member'}'s meal will replace your current choice for this slot.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: "I'll eat this meal", onPress: () => void executeJoin() },
          ],
        );
      } else {
        void executeJoin();
      }
    },
    [slotCoord, isLocked, myActiveProposal, members, setSlotChoice],
  );

  const keepOwnMeal = useCallback(async () => {
    if (!slotCoord || isLocked) return;
    try {
      await setSlotChoice(slotCoord.date, slotCoord.meal, {
        mode: 'use_own_meal',
      });
      haptics.success();
    } catch (error) {
      haptics.error();
      Alert.alert(
        'Could not update choice',
        error instanceof ApiError ? error.message : 'Please try again.',
      );
    }
  }, [slotCoord, isLocked, setSlotChoice]);

  return {
    slot,
    proposals,
    myOwnProposal,
    myActiveProposal,
    isReserved,
    isLocked,
    isSaving,
    members,
    myId,
    isAdmin,
    joinProposal,
    keepOwnMeal,
  };
}
