import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Clock3, ThumbsDown, ThumbsUp, X } from 'lucide-react-native';
import { ApiError } from '@/app/shared/services/apiClient';
import { haptics } from '@/app/shared/services/haptics';
import { useCalendarColors } from '../hooks/useCalendarColors';
import { useCalendarStore } from '../store/calendarStore';
import type { ScheduledDish } from '../types/calendar';

interface SuggestionRowProps {
  dish: ScheduledDish;
  accent: string;
  myId: string;
  canDecide: boolean;
}

const showError = (error: unknown) => {
  haptics.error();
  Alert.alert('That didn’t work', error instanceof ApiError ? error.message : 'Please try again.');
};

/** A suggestion for a meal: the admin decides on it, the person who made it can withdraw it. */
export function SuggestionRow({ dish, accent, myId, canDecide }: SuggestionRowProps) {
  const colors = useCalendarColors();
  const store = useCalendarStore.getState;
  const declined = dish.status === 'declined';

  const decide = (approve: boolean) => {
    if (approve) haptics.success();
    else haptics.selection();
    store().decideSuggestion(dish.id, approve).catch(showError);
  };

  const withdraw = () => {
    haptics.selection();
    store().removeDish(dish.id).catch(showError);
  };

  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      <Text
        numberOfLines={2}
        style={[styles.name, { color: declined ? colors.textMuted : colors.text }, declined && styles.declined]}
      >
        {dish.name}
      </Text>

      {declined ? <Text style={[styles.status, { color: colors.textMuted }]}>Not added to the plan</Text> : null}

      {!declined && canDecide ? (
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => decide(true)}
            style={[styles.action, { backgroundColor: accent }]}
            accessibilityLabel={`Approve ${dish.name}`}
            accessibilityRole="button"
          >
            <ThumbsUp size={12} color={colors.onPrimary} />
            <Text style={[styles.actionText, { color: colors.onPrimary }]}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => decide(false)}
            style={[styles.action, { borderColor: colors.border, borderWidth: 1 }]}
            accessibilityLabel={`Decline ${dish.name}`}
            accessibilityRole="button"
          >
            <ThumbsDown size={12} color={colors.text} />
            <Text style={[styles.actionText, { color: colors.text }]}>Decline</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!declined && !canDecide ? (
        <View style={styles.pending}>
          <Clock3 size={12} color={colors.textMuted} />
          <Text style={[styles.status, { color: colors.textMuted }]}>Waiting for the admin</Text>
          {dish.addedById === myId ? (
            <TouchableOpacity
              onPress={withdraw}
              hitSlop={10}
              accessibilityLabel={`Withdraw ${dish.name}`}
              accessibilityRole="button"
            >
              <X size={14} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, borderWidth: 1, borderRadius: 12, padding: 10 },
  name: { fontSize: 14, fontWeight: '700' },
  declined: { textDecorationLine: 'line-through' },
  status: { fontSize: 11, fontWeight: '600' },
  pending: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 7 },
  actionText: { fontSize: 12, fontWeight: '800' },
});
