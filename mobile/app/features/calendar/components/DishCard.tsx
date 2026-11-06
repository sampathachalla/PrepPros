import React from 'react';
import { Alert, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Check, Clock3, Plus, ThumbsDown, ThumbsUp, Undo2, X } from 'lucide-react-native';
import { ApiError } from '@/app/shared/services/apiClient';
import { haptics } from '@/app/shared/services/haptics';
import { useCalendarColors } from '../hooks/useCalendarColors';
import { useDayPagerLock } from '../hooks/useDayPagerLock';
import { useSwipe } from '../hooks/useSwipe';
import { useCalendarStore } from '../store/calendarStore';
import type { dayPermissions } from '../utils/dayPlanUtils';
import { membersOnDish } from '../utils/householdUtils';
import type { HouseholdMember, ScheduledDish } from '../types/calendar';
import { ContributorAvatarStack } from './ContributorAvatarStack';

interface DishCardProps {
  dish: ScheduledDish;
  accent: string;
  members: HouseholdMember[];
  myId: string;
  permissions: ReturnType<typeof dayPermissions>;
  /** Shown behind the card while swiping left. */
  suggestLabel: string;
  onSuggest: () => void;
}

const MAX_AVATARS = 6;
const SWIPE_THRESHOLD_PX = 80;
const REVEAL_PX = 40;

const showError = (error: unknown) => {
  haptics.error();
  Alert.alert('That didn’t work', error instanceof ApiError ? error.message : 'Please try again.');
};

/** One dish. Swipe right to accept it, left to suggest something else; tapping accepts too. */
export function DishCard({ dish, accent, members, myId, permissions, suggestLabel, onSuggest }: DishCardProps) {
  const colors = useCalendarColors();
  const store = useCalendarStore.getState;
  const setPagerLocked = useDayPagerLock();

  const onPlan = dish.status === 'approved';
  const declined = dish.status === 'declined';
  const chosen = dish.memberIds.includes(myId);
  const canChoose = onPlan && permissions.canAnswer;
  const canAdd = permissions.canEditPlan || permissions.canSuggest;
  const eaters = membersOnDish(members, dish);

  const toggleChoice = () => {
    if (chosen) haptics.selection();
    else haptics.success();
    const task = chosen ? store().withdrawDish(dish, myId) : store().acceptDish(dish, myId);
    task.catch(showError);
  };

  const { translateX, panHandlers } = useSwipe({
    threshold: SWIPE_THRESHOLD_PX,
    canSwipe: (direction) => (direction === 'right' ? canChoose : canAdd),
    onSwipe: (direction) => (direction === 'right' ? toggleChoice() : onSuggest()),
  });

  const confirmRemove = () => {
    haptics.press();
    Alert.alert('Remove this dish?', dish.name, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => store().removeDish(dish.id).catch(showError) },
    ]);
  };

  const decide = (approve: boolean) => {
    if (approve) haptics.success();
    else haptics.selection();
    store().decideSuggestion(dish.id, approve).catch(showError);
  };

  const AcceptIcon = chosen ? Undo2 : Check;
  // A card that can be swiped keeps the swipe for itself; any other card lets it turn the day
  const isSwipeable = canChoose || canAdd;

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          styles.reveal,
          styles.revealLeft,
          {
            backgroundColor: accent,
            opacity: translateX.interpolate({
              inputRange: [0, REVEAL_PX],
              outputRange: [0, 1],
              extrapolate: 'clamp',
            }),
          },
        ]}
      >
        <AcceptIcon size={16} color={colors.onPrimary} strokeWidth={3} />
        <Text style={[styles.revealText, { color: colors.onPrimary }]}>{chosen ? 'Undo' : 'Accept'}</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.reveal,
          styles.revealRight,
          {
            backgroundColor: colors.secondary,
            opacity: translateX.interpolate({
              inputRange: [-REVEAL_PX, 0],
              outputRange: [1, 0],
              extrapolate: 'clamp',
            }),
          },
        ]}
      >
        <Text style={[styles.revealText, { color: colors.onPrimary }]}>{suggestLabel}</Text>
        <Plus size={16} color={colors.onPrimary} strokeWidth={3} />
      </Animated.View>

      <Animated.View
        {...panHandlers}
        onTouchStart={isSwipeable ? () => setPagerLocked(true) : undefined}
        onTouchEnd={() => setPagerLocked(false)}
        onTouchCancel={() => setPagerLocked(false)}
        style={[
          styles.card,
          {
            backgroundColor: colors.background,
            borderColor: chosen ? accent : colors.border,
            transform: [{ translateX }],
          },
          chosen && styles.cardChosen,
        ]}
      >
        <TouchableOpacity
          onPress={canChoose ? toggleChoice : undefined}
          onLongPress={permissions.canEditPlan ? confirmRemove : undefined}
          disabled={!canChoose && !permissions.canEditPlan}
          activeOpacity={0.6}
          style={styles.main}
          accessibilityRole={canChoose ? 'checkbox' : undefined}
          accessibilityState={{ checked: chosen }}
          accessibilityLabel={dish.name}
        >
          {onPlan ? (
            <View style={[styles.checkbox, { borderColor: accent }, chosen && { backgroundColor: accent }]}>
              {chosen ? <Check size={13} color={colors.onPrimary} strokeWidth={3.5} /> : null}
            </View>
          ) : null}

          <View style={styles.text}>
            <Text
              numberOfLines={2}
              style={[
                styles.name,
                { color: declined ? colors.textMuted : colors.text },
                declined && styles.declined,
              ]}
            >
              {dish.name}
            </Text>
            {declined ? <Text style={[styles.status, { color: colors.textMuted }]}>Not added to the plan</Text> : null}
          </View>

          <ContributorAvatarStack members={eaters} size={24} overlap={6} maxVisible={MAX_AVATARS} />
        </TouchableOpacity>

        {dish.status === 'pending' && permissions.canDecide ? (
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

        {dish.status === 'pending' && !permissions.canDecide ? (
          <View style={styles.pending}>
            <Clock3 size={12} color={colors.textMuted} />
            <Text style={[styles.status, { color: colors.textMuted }]}>Waiting for the admin</Text>
            {dish.addedById === myId ? (
              <TouchableOpacity
                onPress={confirmRemove}
                hitSlop={10}
                accessibilityLabel={`Withdraw ${dish.name}`}
                accessibilityRole="button"
              >
                <X size={14} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 14 },
  reveal: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  revealLeft: { justifyContent: 'flex-start' },
  revealRight: { justifyContent: 'flex-end' },
  revealText: { fontSize: 13, fontWeight: '800' },
  card: { gap: 8, borderWidth: 1, borderRadius: 14, padding: 12 },
  cardChosen: { borderWidth: 2 },
  main: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  text: { flex: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '700' },
  declined: { textDecorationLine: 'line-through' },
  status: { fontSize: 11, fontWeight: '600' },
  pending: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 7 },
  actionText: { fontSize: 12, fontWeight: '800' },
});
