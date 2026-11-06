import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Check, ChevronDown, ChevronUp, Clock, Users } from 'lucide-react-native';
import { ContributorAvatarStack } from '../../calendar/components/ContributorAvatarStack';
import { MEAL_CATEGORIES, MEAL_CATEGORY_COLORS } from '../../calendar/constants/calendar';
import { useCalendarColors } from '../../calendar/hooks/useCalendarColors';
import type { HouseholdMember } from '../../calendar/types/calendar';
import { PREP_ACTION_LABELS, PREP_STATUS_LABELS } from '../constants/mealPrep';
import type { PrepDish } from '../types/mealPrep';
import { formatMinutes, servingsNote } from '../utils/prepUtils';

interface PrepDishCardProps {
  dish: PrepDish;
  members: HouseholdMember[];
  myId?: string;
  onToggleStatus: (dish: PrepDish) => void;
  onToggleCook: (dish: PrepDish) => void;
}

/** One dish to cook: for whom, who's cooking it, and how it's going. Expands to the recipe. */
export function PrepDishCard({ dish, members, myId, onToggleStatus, onToggleCook }: PrepDishCardProps) {
  const colors = useCalendarColors();
  const [isExpanded, setIsExpanded] = useState(false);

  const accent = MEAL_CATEGORY_COLORS[dish.meal];
  const mealLabel = MEAL_CATEGORIES.find((meal) => meal.key === dish.meal)?.label;
  const eaters = members.filter((member) => dish.memberIds.includes(member.id));
  const cook = members.find((member) => member.id === dish.assigneeId);
  const isMine = dish.assigneeId === myId;
  const isDone = dish.prepStatus === 'done';
  const minutes = (dish.prepMinutes ?? 0) + (dish.cookMinutes ?? 0);
  const note = servingsNote(dish);
  const hasDetails = dish.ingredients.length > 0 || dish.steps.length > 0 || !!dish.notes;
  const Chevron = isExpanded ? ChevronUp : ChevronDown;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: `${accent}66` }, isDone && styles.done]}>
      <TouchableOpacity
        onPress={() => setIsExpanded((open) => !open)}
        disabled={!hasDetails}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        accessibilityLabel={`${dish.name}, ${dish.servings} servings, ${PREP_STATUS_LABELS[dish.prepStatus]}`}
      >
        <View style={styles.topRow}>
          <View style={[styles.mealChip, { backgroundColor: `${accent}33` }]}>
            <Text style={[styles.mealText, { color: colors.text }]}>{mealLabel}</Text>
          </View>
          <Text style={[styles.status, { color: colors.textMuted }]}>{PREP_STATUS_LABELS[dish.prepStatus]}</Text>
        </View>

        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
            {dish.name}
          </Text>
          {hasDetails ? <Chevron size={18} color={colors.textMuted} /> : null}
        </View>

        <View style={styles.metaRow}>
          <Users size={12} color={colors.textMuted} />
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {dish.servings} {dish.servings === 1 ? 'serving' : 'servings'}
          </Text>
          <ContributorAvatarStack members={eaters} size={20} overlap={6} />
          {minutes > 0 ? (
            <>
              <Clock size={12} color={colors.textMuted} />
              <Text style={[styles.meta, { color: colors.textMuted }]}>{formatMinutes(minutes)}</Text>
            </>
          ) : null}
        </View>
      </TouchableOpacity>

      {isExpanded ? (
        <View style={[styles.details, { borderTopColor: colors.gridLine }]}>
          {note ? <Text style={[styles.note, { color: colors.text }]}>{note}</Text> : null}
          {dish.ingredients.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Ingredients</Text>
              {dish.ingredients.map((ingredient) => (
                <Text key={ingredient} style={[styles.line, { color: colors.textMuted }]}>
                  • {ingredient}
                </Text>
              ))}
            </>
          ) : null}
          {dish.steps.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Steps</Text>
              {dish.steps.map((step, index) => (
                <Text key={step} style={[styles.line, { color: colors.textMuted }]}>
                  {index + 1}. {step}
                </Text>
              ))}
            </>
          ) : null}
          {dish.notes ? <Text style={[styles.line, { color: colors.textMuted }]}>{dish.notes}</Text> : null}
        </View>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={() => onToggleCook(dish)}
          disabled={!!cook && !isMine}
          style={[styles.cookButton, { borderColor: colors.border }]}
          accessibilityRole="button"
        >
          <Text style={[styles.cookText, { color: colors.text }]} numberOfLines={1}>
            {isMine ? 'You’re cooking' : cook ? `${cook.name} is cooking` : 'I’ll cook this'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onToggleStatus(dish)}
          style={[styles.statusButton, { backgroundColor: isDone ? colors.secondarySoft : colors.primary }]}
          accessibilityRole="button"
        >
          {dish.prepStatus === 'in_progress' ? <Check size={14} color={colors.onPrimary} strokeWidth={3} /> : null}
          <Text style={[styles.statusButtonText, { color: isDone ? colors.text : colors.onPrimary }]}>
            {PREP_ACTION_LABELS[dish.prepStatus]}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 10 },
  done: { opacity: 0.65 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  mealChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  mealText: { fontSize: 11, fontWeight: '800' },
  status: { fontSize: 11, fontWeight: '700' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 15, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  meta: { fontSize: 12, marginRight: 6 },
  details: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 10, paddingTop: 8 },
  note: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '800', marginTop: 6, marginBottom: 3 },
  line: { fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  cookButton: { flex: 1, borderWidth: 1, borderRadius: 11, paddingVertical: 9, paddingHorizontal: 8, alignItems: 'center' },
  cookText: { fontSize: 12, fontWeight: '700' },
  statusButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 9 },
  statusButtonText: { fontSize: 12, fontWeight: '800' },
});
