import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useCalendarColors } from '../hooks/useCalendarColors';
import type { DishActionResult, DishOption, MealCategory, ScheduledDish } from '../types/calendar';
import { MealPickerPanel } from './MealPickerPanel';
import { SuggestionRow } from './SuggestionRow';

interface MealPickerSheetProps {
  visible: boolean;
  title: string;
  category: MealCategory;
  /** Suggestions for this meal that aren't on the plan. */
  suggestions: ScheduledDish[];
  accent: string;
  myId: string;
  canDecide: boolean;
  onPick: (option: DishOption | { name: string }) => Promise<DishActionResult>;
  onClose: () => void;
}

/** Where a meal's suggestions are made and decided, so its row only shows what is on the plan. */
export function MealPickerSheet({
  visible,
  title,
  category,
  suggestions,
  accent,
  myId,
  canDecide,
  onPick,
  onClose,
}: MealPickerSheetProps) {
  const colors = useCalendarColors();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" hitSlop={10}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {suggestions.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Suggestions</Text>
              <ScrollView style={styles.suggestions} contentContainerStyle={styles.suggestionList}>
                {suggestions.map((dish) => (
                  <SuggestionRow key={dish.id} dish={dish} accent={accent} myId={myId} canDecide={canDecide} />
                ))}
              </ScrollView>
            </>
          ) : null}

          <MealPickerPanel category={category} onPick={onPick} />
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
  sectionTitle: { fontSize: 12, fontWeight: '800', marginBottom: 8 },
  suggestions: { maxHeight: 200, marginBottom: 12 },
  suggestionList: { gap: 8 },
});
