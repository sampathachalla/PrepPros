import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Check } from 'lucide-react-native';
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
 * A dish on the plan, shown like a poll option: the fill and count give its popularity, the names
 * say who picked it. Tap to accept it, tap again to undo; the admin holds it to remove it.
 */
export function DishCard({ dish, accent, members, myId, permissions }: DishCardProps) {
  const colors = useCalendarColors();
  const store = useCalendarStore.getState;
  const chosen = dish.memberIds.includes(myId);
  const pickers = membersOnDish(members, dish);
  const names = pickerNames(pickers, myId);

  const toggleChoice = () => {
    if (chosen) haptics.selection();
    else haptics.success();
    const task = chosen ? store().withdrawDish(dish, myId) : store().acceptDish(dish, myId);
    task.catch(showError);
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
      onPress={permissions.canAnswer ? toggleChoice : undefined}
      onLongPress={permissions.canEditPlan ? confirmRemove : undefined}
      disabled={!permissions.canAnswer && !permissions.canEditPlan}
      activeOpacity={0.6}
      accessibilityRole={permissions.canAnswer ? 'checkbox' : undefined}
      accessibilityState={{ checked: chosen }}
      accessibilityLabel={names ? `${dish.name}, picked by ${names}` : dish.name}
      style={[
        styles.card,
        { backgroundColor: colors.background, borderColor: chosen ? accent : colors.border },
        chosen && styles.cardChosen,
      ]}
    >
      {members.length > 0 ? (
        <View
          style={[styles.fill, { width: `${(pickers.length / members.length) * 100}%`, backgroundColor: `${accent}26` }]}
        />
      ) : null}
      <View style={[styles.checkbox, { borderColor: accent }, chosen && { backgroundColor: accent }]}>
        {chosen ? <Check size={13} color={colors.onPrimary} strokeWidth={3.5} /> : null}
      </View>
      <View style={styles.text}>
        <Text numberOfLines={2} style={[styles.name, { color: colors.text }]}>
          {dish.name}
        </Text>
        {names ? (
          <Text numberOfLines={1} style={[styles.names, { color: colors.textMuted }]}>
            {names}
          </Text>
        ) : null}
      </View>
      {pickers.length > 0 ? (
        <Text style={[styles.count, { color: colors.text }]}>
          {pickers.length}/{members.length}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    overflow: 'hidden',
  },
  cardChosen: { borderWidth: 2 },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  fill: { position: 'absolute', top: 0, bottom: 0, left: 0 },
  text: { flex: 1, gap: 1 },
  name: { fontSize: 15, fontWeight: '700' },
  names: { fontSize: 12, fontWeight: '600' },
  count: { fontSize: 12, fontWeight: '800' },
});
