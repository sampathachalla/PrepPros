import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Platform,
} from 'react-native';
import {
  X,
  Calendar as CalendarIcon,
  Sun,
  Utensils,
  Moon,
  Apple,
  PlaySquare,
  Bookmark as BookmarkIcon,
} from 'lucide-react-native';
import { InstagramIcon } from './InstagramIcon';
import { Brand, AppTheme, AppThemeDark } from '@/constants/Colors';
import { useThemeContext } from '@/context/ThemeContext';
import type { Bookmark } from '../types/bookmarks';
import type { MealCategory } from '../../calendar/types/calendar';

interface AddToCalendarBookmarkModalProps {
  bookmark: Bookmark | null;
  visible: boolean;
  onClose: () => void;
  onSchedule: (date: string, category: MealCategory, notes?: string) => Promise<{ success: boolean }>;
}

export function AddToCalendarBookmarkModal({
  bookmark,
  visible,
  onClose,
  onSchedule,
}: AddToCalendarBookmarkModalProps) {
  const { theme } = useThemeContext();
  const isDark = theme === 'dark';
  const palette = isDark ? AppThemeDark : AppTheme;

  // Format today / tomorrow date helpers
  const getFormattedDate = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getFormattedDate(0);
  const tomorrowStr = getFormattedDate(1);
  const inTwoDaysStr = getFormattedDate(2);

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedCategory, setSelectedCategory] = useState<MealCategory>('lunch');
  const [customNotes, setCustomNotes] = useState('');

  if (!bookmark) return null;

  const renderSourceIcon = () => {
    if (bookmark.source === 'instagram') {
      return (
        <View style={[styles.sourceIconBox, { backgroundColor: '#E1306C18' }]}>
          <InstagramIcon size={20} color="#E1306C" />
        </View>
      );
    }
    if (bookmark.source === 'youtube') {
      return (
        <View style={[styles.sourceIconBox, { backgroundColor: '#FF000018' }]}>
          <PlaySquare size={20} color="#FF0000" />
        </View>
      );
    }
    return (
      <View style={[styles.sourceIconBox, { backgroundColor: `${Brand.babyPink}25` }]}>
        <BookmarkIcon size={20} color={Brand.babyPink} />
      </View>
    );
  };

  const handleConfirm = () => {
    void onSchedule(selectedDate, selectedCategory, customNotes.trim() || undefined);
  };

  const mealCategories: { key: MealCategory; label: string; icon: typeof Sun }[] = [
    { key: 'breakfast', label: 'Breakfast', icon: Sun },
    { key: 'lunch', label: 'Lunch', icon: Utensils },
    { key: 'dinner', label: 'Dinner', icon: Moon },
    { key: 'snacks', label: 'Snacks', icon: Apple },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.backdrop} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? palette.surface : palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: palette.border }]}>
            <View style={styles.headerTitleRow}>
              <CalendarIcon size={18} color={Brand.babyPink} />
              <Text style={[styles.title, { color: palette.text }]}>Schedule Recipe</Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: isDark ? '#262626' : '#F0F0F0' }]}
            >
              <X size={18} color={palette.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Bookmark Preview Card */}
            <View
              style={[
                styles.previewCard,
                {
                  backgroundColor: isDark ? '#1C1C1E' : '#F7F7F7',
                  borderColor: palette.border,
                },
              ]}
            >
              {renderSourceIcon()}
              <View style={styles.previewInfo}>
                <Text style={[styles.previewAuthor, { color: isDark ? Brand.babyBlue : '#006699' }]} numberOfLines={1}>
                  {bookmark.author}
                </Text>
                <Text style={[styles.previewTitle, { color: palette.text }]} numberOfLines={2}>
                  {bookmark.title}
                </Text>
              </View>
            </View>

            {/* Target Date Selection */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: palette.text }]}>Target Date</Text>
              <View style={styles.datePillsRow}>
                <TouchableOpacity
                  onPress={() => setSelectedDate(todayStr)}
                  style={[
                    styles.datePill,
                    {
                      backgroundColor:
                        selectedDate === todayStr
                          ? Brand.babyPink
                          : isDark
                            ? '#262626'
                            : '#F0F0F0',
                      borderColor: selectedDate === todayStr ? Brand.babyPink : palette.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.datePillText,
                      {
                        color: selectedDate === todayStr ? Brand.black : palette.text,
                        fontWeight: selectedDate === todayStr ? '700' : '500',
                      },
                    ]}
                  >
                    Today
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSelectedDate(tomorrowStr)}
                  style={[
                    styles.datePill,
                    {
                      backgroundColor:
                        selectedDate === tomorrowStr
                          ? Brand.babyPink
                          : isDark
                            ? '#262626'
                            : '#F0F0F0',
                      borderColor: selectedDate === tomorrowStr ? Brand.babyPink : palette.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.datePillText,
                      {
                        color: selectedDate === tomorrowStr ? Brand.black : palette.text,
                        fontWeight: selectedDate === tomorrowStr ? '700' : '500',
                      },
                    ]}
                  >
                    Tomorrow
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSelectedDate(inTwoDaysStr)}
                  style={[
                    styles.datePill,
                    {
                      backgroundColor:
                        selectedDate === inTwoDaysStr
                          ? Brand.babyPink
                          : isDark
                            ? '#262626'
                            : '#F0F0F0',
                      borderColor: selectedDate === inTwoDaysStr ? Brand.babyPink : palette.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.datePillText,
                      {
                        color: selectedDate === inTwoDaysStr ? Brand.black : palette.text,
                        fontWeight: selectedDate === inTwoDaysStr ? '700' : '500',
                      },
                    ]}
                  >
                    In 2 Days
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#1C1C1E' : '#F9F9F9',
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={palette.textMuted}
                value={selectedDate}
                onChangeText={setSelectedDate}
              />
            </View>

            {/* Meal Category Selection */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: palette.text }]}>Meal Slot</Text>
              <View style={styles.categoryGrid}>
                {mealCategories.map((slot) => {
                  const isSelected = selectedCategory === slot.key;
                  const Icon = slot.icon;
                  return (
                    <TouchableOpacity
                      key={slot.key}
                      onPress={() => setSelectedCategory(slot.key)}
                      style={[
                        styles.categoryTile,
                        {
                          backgroundColor: isSelected
                            ? Brand.babyBlue
                            : isDark
                              ? '#262626'
                              : '#F0F0F0',
                          borderColor: isSelected ? Brand.babyBlue : palette.border,
                        },
                      ]}
                    >
                      <Icon size={18} color={isSelected ? Brand.black : palette.text} />
                      <Text
                        style={[
                          styles.categoryTileText,
                          {
                            color: isSelected ? Brand.black : palette.text,
                            fontWeight: isSelected ? '700' : '600',
                          },
                        ]}
                      >
                        {slot.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Optional Prep Notes */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: palette.text }]}>Prep Notes (Optional)</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.notesInput,
                  {
                    backgroundColor: isDark ? '#1C1C1E' : '#F9F9F9',
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
                placeholder="e.g. Cook double batch for tomorrow"
                placeholderTextColor={palette.textMuted}
                value={customNotes}
                onChangeText={setCustomNotes}
                multiline
              />
            </View>

            {/* Confirm Button */}
            <TouchableOpacity
              onPress={handleConfirm}
              activeOpacity={0.85}
              style={[styles.confirmButton, { backgroundColor: Brand.babyPink }]}
            >
              <Text style={styles.confirmButtonText}>Add to Meal Plan</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  sourceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  previewInfo: {
    flex: 1,
  },
  previewAuthor: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  datePillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  datePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  datePillText: {
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  categoryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  categoryTileText: {
    fontSize: 11,
  },
  notesInput: {
    minHeight: 50,
  },
  confirmButton: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 10,
  },
  confirmButtonText: {
    color: Brand.black,
    fontSize: 15,
    fontWeight: '800',
  },
});
