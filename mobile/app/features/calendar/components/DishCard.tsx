import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Check, Clock3, Info, ThumbsDown, ThumbsUp } from 'lucide-react-native';
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
  onInspect?: (dish: ScheduledDish) => void;
}

const showError = (error: unknown) => {
  haptics.error();
  Alert.alert('That didn’t work', error instanceof ApiError ? error.message : 'Please try again.');
};

/**
 * A dish on the plan: in voting mode tap to accept/undo; in published/read-only mode tap to open
 * Dish Details (ingredients, steps, and prep times).
 */
export function DishCard({ dish, accent, members, myId, permissions, onInspect }: DishCardProps) {
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
  const totalMinutes = (dish.prepMinutes ?? 0) + (dish.cookMinutes ?? 0);
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

  const handlePress = () => {
    if (canChoose) {
      toggleChoice();
      return;
    }
    if (onInspect) {
      haptics.selection();
      onInspect(dish);
    }
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
      onPress={handlePress}
      onLongPress={permissions.canEditPlan ? confirmRemove : undefined}
      disabled={!canChoose && !permissions.canEditPlan && !onInspect}
      activeOpacity={0.7}
      accessibilityRole={canChoose ? 'checkbox' : 'button'}
      accessibilityState={canChoose ? { checked: chosen } : undefined}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.card,
        { backgroundColor: colors.background, borderColor: chosen ? accent : colors.border },
        chosen && styles.cardChosen,
        waiting && styles.cardWaiting,
      ]}
    >
      {dish.imageUrl ? (
        <Image source={{ uri: dish.imageUrl }} style={styles.thumb} contentFit="cover" transition={150} />
      ) : null}
      <View style={styles.topRow}>
        {waiting ? (
          <Clock3 size={18} color={colors.textMuted} />
        ) : (
          <View style={[styles.checkbox, { borderColor: accent }, chosen && { backgroundColor: accent }]}>
            {chosen ? <Check size={13} color={colors.onPrimary} strokeWidth={3.5} /> : null}
          </View>
        )}
        <View style={styles.topMetaRight}>
          <Text style={[styles.count, { color: waiting ? colors.textMuted : colors.text }]}>
            {waiting ? 'Waiting' : count}
          </Text>
          {onInspect ? (
            <TouchableOpacity
              onPress={() => {
                haptics.selection();
                onInspect(dish);
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`View details for ${dish.name}`}
            >
              <Info size={14} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      <View style={styles.text}>
        <Text numberOfLines={2} style={[styles.name, { color: colors.text }]}>
          {dish.name}
        </Text>
        {totalMinutes > 0 ? (
          <Text style={[styles.timeBadge, { color: colors.textMuted }]}>{totalMinutes} min</Text>
        ) : null}
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
  thumb: {
    width: '100%',
    height: 68,
    borderRadius: 9,
    marginBottom: 2,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  topMetaRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  text: { flexGrow: 1, gap: 2 },
  name: { fontSize: 14, fontWeight: '700' },
  timeBadge: { fontSize: 11, fontWeight: '700' },
  names: { fontSize: 12, fontWeight: '600' },
  count: { fontSize: 12, fontWeight: '800' },
  decisions: { flexDirection: 'row', gap: 6 },
  decision: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
});
