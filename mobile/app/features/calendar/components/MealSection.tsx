import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Apple, Moon, PencilLine, Plus, Sun, Utensils } from 'lucide-react-native';
import { haptics } from '@/app/shared/services/haptics';
import { useCalendarColors } from '../hooks/useCalendarColors';
import { MEAL_CATEGORY_COLORS } from '../constants/calendar';
import { findOwnDish, type dayPermissions } from '../utils/dayPlanUtils';
import type { HouseholdMember, MealCategory, ScheduledDish } from '../types/calendar';
import { DishCard } from './DishCard';
import { SuggestionRow } from './SuggestionRow';

interface MealSectionProps {
  category: MealCategory;
  label: string;
  dishes: ScheduledDish[];
  members: HouseholdMember[];
  myId: string;
  permissions: ReturnType<typeof dayPermissions>;
  /** Every row but the first draws the line separating it from the one above. */
  showDivider: boolean;
  onAdd: () => void;
}

const CATEGORY_ICONS = { breakfast: Sun, lunch: Utensils, dinner: Moon, snacks: Apple } as const;

/** One meal's row: the dishes the admin has set, and your own suggestions. Its button opens the picker. */
export function MealSection({
  category,
  label,
  dishes,
  members,
  myId,
  permissions,
  showDivider,
  onAdd,
}: MealSectionProps) {
  const colors = useCalendarColors();
  const accent = MEAL_CATEGORY_COLORS[category];
  const Icon = CATEGORY_ICONS[category];

  const ownDish = findOwnDish(dishes, myId);
  // A member's dish can't be swapped once the admin has approved it
  const canAdd = permissions.canEditPlan || (permissions.canSuggest && ownDish?.status !== 'approved');
  // One dish each: Suggest adds it, then Update replaces it
  const buttonLabel = ownDish ? 'Update' : 'Suggest';
  const ButtonIcon = ownDish ? PencilLine : Plus;
  const pendingCount = dishes.filter((dish) => dish.status === 'pending').length;
  const gridDishes = dishes.filter(
    (dish) => dish.status === 'approved' || (dish.status === 'pending' && dish.addedById !== myId),
  );
  const ownSuggestions = permissions.canEditPlan
    ? []
    : dishes.filter((dish) => dish.status !== 'approved' && dish.addedById === myId);

  const openPicker = () => {
    haptics.selection();
    onAdd();
  };

  return (
    <View style={[styles.row, showDivider && { borderTopWidth: 1, borderTopColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconBubble, { backgroundColor: `${accent}33` }]}>
          <Icon size={15} color={accent} />
        </View>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      </View>

      {gridDishes.length > 0 ? (
        <View style={styles.grid}>
          {gridDishes.map((dish) => (
            <DishCard
              key={dish.id}
              dish={dish}
              accent={accent}
              members={members}
              myId={myId}
              permissions={permissions}
            />
          ))}
        </View>
      ) : null}

      {ownSuggestions.map((dish) => (
        <SuggestionRow key={dish.id} dish={dish} accent={accent} myId={myId} canDecide={false} />
      ))}

      {gridDishes.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {canAdd ? 'Nothing planned yet' : 'No dishes for this meal'}
        </Text>
      ) : null}

      {canAdd ? (
        <TouchableOpacity
          onPress={openPicker}
          activeOpacity={0.7}
          style={[styles.button, { borderColor: accent }]}
          accessibilityRole="button"
          accessibilityLabel={`${buttonLabel} for ${label}${pendingCount > 0 ? `, ${pendingCount} waiting` : ''}`}
        >
          <ButtonIcon size={13} color={colors.text} strokeWidth={2.5} />
          <Text style={[styles.buttonText, { color: colors.text }]}>{buttonLabel}</Text>
          {pendingCount > 0 ? (
            <View style={[styles.pendingBadge, { backgroundColor: accent }]}>
              <Text style={[styles.pendingText, { color: colors.onPrimary }]}>{pendingCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Rows split the spare height evenly, and never get too small to read
  row: { flexGrow: 1, minHeight: 84, justifyContent: 'center', gap: 8, padding: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBubble: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: 15, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  emptyText: { fontSize: 13 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  buttonText: { fontSize: 12, fontWeight: '800' },
  pendingBadge: { minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  pendingText: { fontSize: 10, fontWeight: '800' },
});
