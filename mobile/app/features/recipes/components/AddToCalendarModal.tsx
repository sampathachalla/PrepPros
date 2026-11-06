import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { X, Calendar as CalendarIcon, Check } from 'lucide-react-native';
import { Brand, AppTheme, AppThemeDark } from '@/constants/Colors';
import { useThemeContext } from '@/context/ThemeContext';
import type { MealCategory } from '../../calendar/types/calendar';
import type { Recipe } from '../types/recipes';

interface AddToCalendarModalProps {
  recipe: Recipe | null;
  visible: boolean;
  onClose: () => void;
  onSchedule: (date: string, category: MealCategory) => Promise<void>;
}

export function AddToCalendarModal({
  recipe,
  visible,
  onClose,
  onSchedule,
}: AddToCalendarModalProps) {
  const { theme } = useThemeContext();
  const isDark = theme === 'dark';
  const palette = isDark ? AppThemeDark : AppTheme;

  // Generate the next 5 days
  const today = new Date();
  const dayOptions = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0] ?? '';
    const label =
      i === 0
        ? 'Today'
        : i === 1
        ? 'Tomorrow'
        : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return { dateStr, label };
  });

  const [selectedDate, setSelectedDate] = useState<string>(
    dayOptions[0]?.dateStr ?? '',
  );
  const [selectedSlot, setSelectedSlot] = useState<MealCategory>('lunch');

  if (!recipe) return null;

  const mealSlots: { key: MealCategory; label: string }[] = [
    { key: 'breakfast', label: 'Breakfast' },
    { key: 'lunch', label: 'Lunch' },
    { key: 'dinner', label: 'Dinner' },
    { key: 'snacks', label: 'Snacks' },
  ];

  const handleConfirm = () => {
    void onSchedule(selectedDate, selectedSlot);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[styles.dialog, { backgroundColor: palette.background }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <View style={styles.titleRow}>
                <CalendarIcon size={18} color={Brand.babyPink} style={{ marginRight: 6 }} />
                <Text style={[styles.dialogTitle, { color: palette.text }]}>
                  Schedule Meal
                </Text>
              </View>
              <Text numberOfLines={1} style={[styles.recipeTitle, { color: palette.textMuted }]}>
                {recipe.title}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: palette.surface }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color={palette.text} />
            </TouchableOpacity>
          </View>

          {/* Date Selector */}
          <Text style={[styles.sectionLabel, { color: palette.text }]}>Select Day</Text>
          <View style={styles.chipRow}>
            {dayOptions.map((opt) => {
              const isSelected = selectedDate === opt.dateStr;
              return (
                <TouchableOpacity
                  key={opt.dateStr}
                  onPress={() => setSelectedDate(opt.dateStr)}
                  style={[
                    styles.dateChip,
                    {
                      backgroundColor: isSelected ? Brand.babyBlue : palette.surface,
                      borderColor: isSelected ? Brand.babyBlue : palette.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isSelected ? Brand.black : palette.textMuted,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Meal Category Selector */}
          <Text style={[styles.sectionLabel, { color: palette.text }]}>Select Meal</Text>
          <View style={styles.slotsGrid}>
            {mealSlots.map((slot) => {
              const isSelected = selectedSlot === slot.key;
              return (
                <TouchableOpacity
                  key={slot.key}
                  onPress={() => setSelectedSlot(slot.key)}
                  style={[
                    styles.slotCard,
                    {
                      backgroundColor: isSelected ? Brand.babyPink : palette.surface,
                      borderColor: isSelected ? Brand.babyPink : palette.border,
                    },
                  ]}
                >
                  {isSelected && (
                    <View style={styles.checkIcon}>
                      <Check size={12} color={Brand.black} strokeWidth={3} />
                    </View>
                  )}
                  <Text
                    style={[
                      styles.slotText,
                      {
                        color: isSelected ? Brand.black : palette.text,
                        fontWeight: isSelected ? '800' : '600',
                      },
                    ]}
                  >
                    {slot.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            onPress={handleConfirm}
            activeOpacity={0.85}
            style={[styles.confirmBtn, { backgroundColor: Brand.babyPink }]}
          >
            <Text style={styles.confirmBtnText}>Add to Meal Planner</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
    marginRight: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  recipeTitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  dateChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  slotCard: {
    width: '48%',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  checkIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  slotText: {
    fontSize: 13,
  },
  confirmBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: Brand.black,
    fontSize: 15,
    fontWeight: '800',
  },
});
