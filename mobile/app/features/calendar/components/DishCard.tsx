import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Check, Clock3, ThumbsDown, ThumbsUp } from 'lucide-react-native';
import { ApiError } from '@/app/shared/services/apiClient';
import { haptics } from '@/app/shared/services/haptics';
import { useCalendarColors } from '../hooks/useCalendarColors';
import { useCalendarStore } from '../store/calendarStore';
import type { dayPermissions } from '../utils/dayPlanUtils';
import { membersOnDish, pickerNames } from '../utils/householdUtils';
import type { HouseholdMember, ScheduledDish } from '../types/calendar';

interface DishCardProps {
  dish: ScheduledDish;
  accent: string;
  members: HouseholdMember[];
  myId: string;
  permissions: ReturnType<typeof dayPermissions>;
}

const showError = (error: unknown) => {
  haptics.error();
  Alert.alert('That didn’t work', error instanceof ApiError ? error.message : 'Please try again.');
};

/**
 * A dish on the plan, shown like a poll option: the count gives its popularity, the names say who
 * picked it. Tap to accept it, tap again to undo; the admin holds it to remove it. Someone
 * else's suggestion shows here too, but can't be chosen until the admin approves or declines it here.
 */
export function DishCard({ dish, accent, members, myId, permissions }: DishCardProps) {
  const colors = useCalendarColors();
  const store = useCalendarStore.getState;
  const chosen = dish.memberIds.includes(myId);
  const pickers = membersOnDish(members, dish);
  const names = pickerNames(pickers, myId);
  const count = `${pickers.length} of ${members.length}`;
  const waiting = dish.status === 'pending';
  const canChoose = permissions.canAnswer && !waiting;
  const suggester = waiting ? members.find((member) => member.id === dish.addedById) : undefined;
  const detail = suggester ? `Suggested by ${pickerNames([suggester], myId)}` : names;
  const accessibilityLabel = (
    waiting
      ? [dish.name, 'waiting for the admin', detail]
      : [dish.name, `${count} picked`, names && `picked by ${names}`]
  )
    .filter(Boolean)
    .join(', ');

  const toggleChoice = () => {
    if (chosen) haptics.selection();
    else haptics.success();
    const task = chosen ? store().withdrawDish(dish, myId) : store().acceptDish(dish, myId);
    task.catch(showError);
  };

  const decide = (approve: boolean) => {
    if (approve) haptics.success();
    else haptics.selection();
    store().decideSuggestion(dish.id, approve).catch(showError);
  };

  const confirmRemove = () => {
    haptics.press();
    Alert.alert('Remove this dish?', dish.name, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => store().removeDish(dish.id).catch(showError) },
    ]);
  };

  return (
    <TouchableOpacity
      onPress={canChoose ? toggleChoice : undefined}
      onLongPress={permissions.canEditPlan ? confirmRemove : undefined}
      disabled={!canChoose && !permissions.canEditPlan}
      activeOpacity={0.6}
      accessibilityRole={canChoose ? 'checkbox' : undefined}
      accessibilityState={canChoose ? { checked: chosen } : undefined}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.card,
        { backgroundColor: colors.background, borderColor: chosen ? accent : colors.border },
        chosen && styles.cardChosen,
        waiting && styles.cardWaiting,
      ]}
    >
      <View style={styles.topRow}>
        {waiting ? (
          <Clock3 size={18} color={colors.textMuted} />
        ) : (
          <View style={[styles.checkbox, { borderColor: accent }, chosen && { backgroundColor: accent }]}>
            {chosen ? <Check size={13} color={colors.onPrimary} strokeWidth={3.5} /> : null}
          </View>
        )}
        <Text style={[styles.count, { color: waiting ? colors.textMuted : colors.text }]}>
          {waiting ? 'Waiting' : count}
        </Text>
      </View>
      <View style={styles.text}>
        <Text numberOfLines={2} style={[styles.name, { color: colors.text }]}>
          {dish.name}
        </Text>
        {detail ? (
          <Text numberOfLines={1} style={[styles.names, { color: colors.textMuted }]}>
            {detail}
          </Text>
        ) : null}
      </View>
      {waiting && permissions.canDecide ? (
        <View style={styles.decisions}>
          <TouchableOpacity
            onPress={() => decide(true)}
            style={[styles.decision, { backgroundColor: accent }]}
            accessibilityLabel={`Approve ${dish.name}`}
            accessibilityRole="button"
          >
            <ThumbsUp size={16} color={colors.onPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => decide(false)}
            style={[styles.decision, { borderColor: colors.border, borderWidth: 1 }]}
            accessibilityLabel={`Decline ${dish.name}`}
            accessibilityRole="button"
          >
            <ThumbsDown size={16} color={colors.text} />
          </TouchableOpacity>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // One of two columns; MealSection lays the cards out
  card: {
    width: '49%',
    minHeight: 112,
    gap: 6,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    overflow: 'hidden',
  },
  cardChosen: { borderWidth: 2 },
  cardWaiting: { borderStyle: 'dashed' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  text: { flexGrow: 1, gap: 1 },
  name: { fontSize: 14, fontWeight: '700' },
  names: { fontSize: 12, fontWeight: '600' },
  count: { fontSize: 12, fontWeight: '800' },
  decisions: { flexDirection: 'row', gap: 6 },
  decision: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
});
