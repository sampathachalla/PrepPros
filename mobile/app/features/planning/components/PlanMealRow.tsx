import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Apple, Moon, Plus, Sun, Utensils, X } from 'lucide-react-native';
import { ApiError } from '@/app/shared/services/apiClient';
import { haptics } from '@/app/shared/services/haptics';
import { SuggestionRow } from '../../calendar/components/SuggestionRow';
import { MEAL_CATEGORY_COLORS } from '../../calendar/constants/calendar';
import { useCalendarColors } from '../../calendar/hooks/useCalendarColors';
import { useCalendarStore } from '../../calendar/store/calendarStore';
import type { dayPermissions } from '../../calendar/utils/dayPlanUtils';
import type { MealCategory, ScheduledDish } from '../../calendar/types/calendar';

interface PlanMealRowProps {
  category: MealCategory;
  label: string;
  dishes: ScheduledDish[];
  myId: string;
  permissions: ReturnType<typeof dayPermissions>;
  showDivider: boolean;
  onAdd: () => void;
}

const CATEGORY_ICONS = { breakfast: Sun, lunch: Utensils, dinner: Moon, snacks: Apple } as const;

const showError = (error: unknown) => {
  haptics.error();
  Alert.alert('That didn’t work', error instanceof ApiError ? error.message : 'Please try again.');
};

/** One meal of the day being planned: what's on the plan, then what's waiting for a decision. */
export function PlanMealRow({ category, label, dishes, myId, permissions, showDivider, onAdd }: PlanMealRowProps) {
  const colors = useCalendarColors();
  const accent = MEAL_CATEGORY_COLORS[category];
  const Icon = CATEGORY_ICONS[category];

  const canAdd = permissions.canEditPlan || permissions.canSuggest;
  const onPlan = dishes.filter((dish) => dish.status === 'approved');
  const suggestions = dishes.filter((dish) => dish.status !== 'approved');
  const actionLabel = permissions.canEditPlan ? 'Add' : 'Pick';

  const confirmRemove = (dish: ScheduledDish) => {
    haptics.press();
    Alert.alert('Remove this dish?', dish.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => useCalendarStore.getState().removeDish(dish.id).catch(showError),
      },
    ]);
  };

  return (
    <View style={[styles.row, showDivider && { borderTopWidth: 1, borderTopColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconBubble, { backgroundColor: `${accent}33` }]}>
          <Icon size={15} color={accent} />
        </View>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        {canAdd ? (
          <TouchableOpacity
            onPress={onAdd}
            activeOpacity={0.7}
            hitSlop={6}
            style={[styles.addButton, { borderColor: accent }]}
            accessibilityRole="button"
            accessibilityLabel={`${actionLabel} for ${label}`}
          >
            <Plus size={13} color={colors.text} strokeWidth={2.5} />
            <Text style={[styles.addText, { color: colors.text }]}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {onPlan.map((dish) => (
        <View key={dish.id} style={[styles.dish, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text numberOfLines={2} style={[styles.dishName, { color: colors.text }]}>
            {dish.name}
          </Text>
          {permissions.canEditPlan ? (
            <TouchableOpacity
              onPress={() => confirmRemove(dish)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${dish.name}`}
            >
              <X size={15} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      ))}

      {suggestions.map((dish) => (
        <SuggestionRow key={dish.id} dish={dish} accent={accent} myId={myId} canDecide={permissions.canDecide} />
      ))}

      {dishes.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>{canAdd ? 'Nothing yet' : 'Nothing planned'}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, padding: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBubble: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: 15, fontWeight: '800' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  addText: { fontSize: 12, fontWeight: '800' },
  dish: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, padding: 10 },
  dishName: { flex: 1, fontSize: 14, fontWeight: '700' },
  empty: { fontSize: 13 },
});
