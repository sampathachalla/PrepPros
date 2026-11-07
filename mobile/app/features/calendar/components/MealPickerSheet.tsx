import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { ApiError } from '@/app/shared/services/apiClient';
import { haptics } from '@/app/shared/services/haptics';
import { useCalendarColors } from '../hooks/useCalendarColors';
import { useCalendarStore } from '../store/calendarStore';
import { findOwnDish } from '../utils/dayPlanUtils';
import type {
  DishActionResult,
  DishOption,
  HouseholdMember,
  MealCategory,
  ScheduledDish,
} from '../types/calendar';
import { MealPickerPanel } from './MealPickerPanel';

interface MealPickerSheetProps {
  meal: MealCategory | null;
  title: string;
  date: string;
  dishes: ScheduledDish[];
  members: HouseholdMember[];
  myId: string;
  canAnswer: boolean;
  onClose: () => void;
}

const failure = (error: unknown): DishActionResult => {
  haptics.error();
  return { success: false, error: error instanceof ApiError ? error.message : 'Please try again.' };
};

/** Replacing a dish clears the picks on it, so ask first when other people have picked it. */
const confirmReplace = (dish: ScheduledDish) =>
  new Promise<boolean>((resolve) => {
    Alert.alert(
      `Replace ${dish.name}?`,
      'Everyone who picked it will need to choose again.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Replace', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });

/** Add or replace your one dish without leaving the day. Picking it closes the sheet. */
export function MealPickerSheet({ meal, title, date, dishes, members, myId, canAnswer, onClose }: MealPickerSheetProps) {
  const colors = useCalendarColors();
  const ownDish = findOwnDish(dishes, myId);

  const handlePick = async (option: DishOption | { name: string }): Promise<DishActionResult> => {
    if (!meal) return { success: false };
    const { name, recipeId, bookmarkId, fromDishId } = option as DishOption;
    const source = recipeId ? { recipeId } : bookmarkId ? { bookmarkId } : fromDishId ? { fromDishId } : { name };
    const pickedByOthers = ownDish?.memberIds.some((id) => id !== myId);
    if (pickedByOthers && !(await confirmReplace(ownDish!))) return { success: true };
    try {
      await useCalendarStore.getState().addDish({ ...source, date, category: meal, replacesDishId: ownDish?.id });
      haptics.success();
      onClose();
      return { success: true };
    } catch (error) {
      return failure(error);
    }
  };

  const handleToggleChoice = async (dish: ScheduledDish): Promise<DishActionResult> => {
    const store = useCalendarStore.getState();
    const chosen = dish.memberIds.includes(myId);
    try {
      await (chosen ? store.withdrawDish(dish, myId) : store.acceptDish(dish, myId));
      if (chosen) haptics.selection();
      else haptics.success();
      return { success: true };
    } catch (error) {
      return failure(error);
    }
  };

  return (
    <Modal visible={meal !== null} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" hitSlop={10}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {meal ? (
            <MealPickerPanel
              category={meal}
              onPick={handlePick}
              householdDishes={dishes}
              memberCount={members.length}
              myId={myId}
              canAnswer={canAnswer}
              onToggleChoice={handleToggleChoice}
              replacing={Boolean(ownDish)}
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, paddingBottom: 36 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 18, fontWeight: '800' },
});
