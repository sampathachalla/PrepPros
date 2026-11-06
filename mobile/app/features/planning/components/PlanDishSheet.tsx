import React, { useState } from 'react';
import {
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
import { MealPickerPanel } from '../../calendar/components/MealPickerPanel';
import { useCalendarColors } from '../../calendar/hooks/useCalendarColors';
import { useCalendarStore } from '../../calendar/store/calendarStore';
import type { DishActionResult, DishOption, MealCategory } from '../../calendar/types/calendar';
import type { DayItem } from '../../calendar/utils/dateUtils';

interface PlanDishSheetProps {
  meal: MealCategory | null;
  title: string;
  date: string;
  /** Other days this dish can go on at the same time. Empty for members, who pick day by day. */
  otherDays: DayItem[];
  onClose: () => void;
}

/** Choose dishes for a meal. Stays open, so several can be added in one go. */
export function PlanDishSheet({ meal, title, date, otherDays, onClose }: PlanDishSheetProps) {
  const colors = useCalendarColors();
  const [alsoOn, setAlsoOn] = useState<string[]>([]);
  const [added, setAdded] = useState<string[]>([]);

  const close = () => {
    setAlsoOn([]);
    setAdded([]);
    onClose();
  };

  const toggleDay = (dateString: string) => {
    haptics.selection();
    setAlsoOn((days) => (days.includes(dateString) ? days.filter((day) => day !== dateString) : [...days, dateString]));
  };

  const handlePick = async (option: DishOption | { name: string }): Promise<DishActionResult> => {
    if (!meal) return { success: false };
    const { name, recipeId, bookmarkId, fromDishId } = option as DishOption;
    const source = recipeId ? { recipeId } : bookmarkId ? { bookmarkId } : fromDishId ? { fromDishId } : { name };
    const { addDish } = useCalendarStore.getState();
    try {
      await addDish({ ...source, date, category: meal });
      // A day that already has this dish is simply skipped
      await Promise.allSettled(alsoOn.map((day) => addDish({ ...source, date: day, category: meal })));
      haptics.success();
      setAdded((names) => [...names, option.name]);
      return { success: true };
    } catch (error) {
      haptics.error();
      return { success: false, error: error instanceof ApiError ? error.message : 'Please try again.' };
    }
  };

  return (
    <Modal visible={meal !== null} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={close} accessibilityLabel="Close" accessibilityRole="button" hitSlop={10}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {otherDays.length > 0 ? (
            <View style={styles.days}>
              <Text style={[styles.daysLabel, { color: colors.textMuted }]}>Also add to</Text>
              <View style={styles.chips}>
                {otherDays.map((day) => {
                  const selected = alsoOn.includes(day.dateString);
                  return (
                    <TouchableOpacity
                      key={day.dateString}
                      onPress={() => toggleDay(day.dateString)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected ? colors.primary : colors.inputBackground,
                          borderColor: selected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: selected ? colors.onPrimary : colors.text }]}>
                        {day.dayName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}

          {meal ? <MealPickerPanel category={meal} onPick={handlePick} /> : null}

          {added.length > 0 ? (
            <Text numberOfLines={2} style={[styles.added, { color: colors.textMuted }]}>
              Added: {added.join(', ')}
            </Text>
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
  days: { marginBottom: 12 },
  daysLabel: { fontSize: 12, fontWeight: '800', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { fontSize: 12, fontWeight: '700' },
  added: { fontSize: 12, fontWeight: '600' },
});
