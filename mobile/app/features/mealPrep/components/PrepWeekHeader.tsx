import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useCalendarColors } from '../../calendar/hooks/useCalendarColors';
import type { MealPrepView } from '../types/mealPrep';

interface PrepWeekHeaderProps {
  title: string;
  view: MealPrepView;
  onChangeView: (view: MealPrepView) => void;
  onPrevious: () => void;
  onNext: () => void;
}

const VIEWS: { key: MealPrepView; label: string }[] = [
  { key: 'cook', label: 'Cook' },
  { key: 'shop', label: 'Shop' },
];

export function PrepWeekHeader({ title, view, onChangeView, onPrevious, onNext }: PrepWeekHeaderProps) {
  const colors = useCalendarColors();

  return (
    <View style={styles.row}>
      <TouchableOpacity onPress={onPrevious} hitSlop={10} accessibilityLabel="Previous week" accessibilityRole="button">
        <ChevronLeft size={22} color={colors.secondary} />
      </TouchableOpacity>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>
      <TouchableOpacity onPress={onNext} hitSlop={10} accessibilityLabel="Next week" accessibilityRole="button">
        <ChevronRight size={22} color={colors.secondary} />
      </TouchableOpacity>

      <View style={[styles.switcher, { backgroundColor: colors.secondarySoft }]} accessibilityRole="tablist">
        {VIEWS.map(({ key, label }) => {
          const selected = view === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => onChangeView(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={[styles.switchItem, selected && { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.switchText, { color: selected ? colors.onPrimary : colors.text }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { flex: 1, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  switcher: { flexDirection: 'row', borderRadius: 18, padding: 3, marginLeft: 4 },
  switchItem: { paddingHorizontal: 13, paddingVertical: 6, borderRadius: 15 },
  switchText: { fontSize: 13, fontWeight: '800' },
});
