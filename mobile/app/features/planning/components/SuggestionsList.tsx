import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SuggestionRow } from '../../calendar/components/SuggestionRow';
import { MEAL_CATEGORIES, MEAL_CATEGORY_COLORS } from '../../calendar/constants/calendar';
import { useCalendarColors } from '../../calendar/hooks/useCalendarColors';
import { formatDisplayDate } from '../../calendar/utils/dateUtils';
import type { ScheduledDish } from '../../calendar/types/calendar';

interface SuggestionsListProps {
  suggestions: ScheduledDish[];
  myId: string;
}

/** Everything the household asked for this week, for the admin to go through in one pass. */
export function SuggestionsList({ suggestions, myId }: SuggestionsListProps) {
  const colors = useCalendarColors();

  if (suggestions.length === 0) {
    return (
      <Text style={[styles.empty, { color: colors.textMuted }]}>No suggestions waiting for this week</Text>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
      {suggestions.map((dish, index) => {
        const isNewDay = dish.date !== suggestions[index - 1]?.date;
        const mealLabel = MEAL_CATEGORIES.find(({ key }) => key === dish.category)?.label;
        return (
          <View key={dish.id} style={styles.item}>
            {isNewDay ? (
              <Text style={[styles.day, { color: colors.text }]}>{formatDisplayDate(dish.date)}</Text>
            ) : null}
            <Text style={[styles.meal, { color: colors.textMuted }]}>{mealLabel}</Text>
            <SuggestionRow dish={dish} accent={MEAL_CATEGORY_COLORS[dish.category]} myId={myId} canDecide />
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10, padding: 12, paddingBottom: 32 },
  item: { gap: 4 },
  day: { fontSize: 15, fontWeight: '800', marginTop: 6 },
  meal: { fontSize: 12, fontWeight: '700' },
  empty: { fontSize: 13, textAlign: 'center', padding: 32 },
});
