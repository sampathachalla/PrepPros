import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Apple, Moon, Plus, Sun, Utensils } from 'lucide-react-native';
import { haptics } from '@/app/shared/services/haptics';
import { useCalendarColors } from '../hooks/useCalendarColors';
import { MEAL_CATEGORY_COLORS } from '../constants/calendar';
import type { dayPermissions } from '../utils/dayPlanUtils';
import type {
  AddDishPayload,
  DishActionResult,
  DishOption,
  HouseholdMember,
  MealCategory,
  ScheduledDish,
} from '../types/calendar';
import { DishCard } from './DishCard';
import { MealPickerSheet } from './MealPickerSheet';

interface MealSectionProps {
  category: MealCategory;
  label: string;
  dishes: ScheduledDish[];
  members: HouseholdMember[];
  myId: string;
  permissions: ReturnType<typeof dayPermissions>;
  onAddDish: (payload: Omit<AddDishPayload, 'date'>) => Promise<DishActionResult>;
  /** Every row but the first draws the line separating it from the one above. */
  showDivider: boolean;
}

const CATEGORY_ICONS = { breakfast: Sun, lunch: Utensils, dinner: Moon, snacks: Apple } as const;

const ROW_PADDING = 12;

/** One meal's row: its dishes stacked, then a way to add more. */
export function MealSection({
  category,
  label,
  dishes,
  members,
  myId,
  permissions,
  onAddDish,
  showDivider,
}: MealSectionProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const colors = useCalendarColors();
  const accent = MEAL_CATEGORY_COLORS[category];
  const Icon = CATEGORY_ICONS[category];

  const canAdd = permissions.canEditPlan || permissions.canSuggest;
  const addLabel = permissions.canEditPlan ? 'Add dish' : 'Suggest a meal';
  const approved = dishes.filter((dish) => dish.status === 'approved');
  const answered = approved.reduce((count, dish) => count + dish.memberIds.length, 0);

  const handlePick = async (option: DishOption | { name: string }) => {
    const { name, recipeId, bookmarkId, fromDishId } = option as DishOption;
    const source = recipeId ? { recipeId } : bookmarkId ? { bookmarkId } : fromDishId ? { fromDishId } : { name };
    const result = await onAddDish({ category, ...source });
    if (result.success) {
      haptics.success();
      setIsPickerOpen(false);
    } else {
      haptics.error();
    }
    return result;
  };

  return (
    <View style={[styles.row, showDivider && { borderTopWidth: 1, borderTopColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconBubble, { backgroundColor: `${accent}33` }]}>
          <Icon size={15} color={accent} />
        </View>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        {approved.length > 0 ? (
          <View style={[styles.countBadge, { backgroundColor: `${accent}40` }]}>
            <Text style={[styles.countText, { color: colors.text }]}>
              {answered}/{members.length}
            </Text>
          </View>
        ) : null}
      </View>

      {dishes.map((dish) => (
        <DishCard
          key={dish.id}
          dish={dish}
          accent={accent}
          members={members}
          myId={myId}
          permissions={permissions}
          suggestLabel={addLabel}
          onSuggest={() => setIsPickerOpen(true)}
        />
      ))}

      {dishes.length === 0 && !canAdd ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No dishes for this meal</Text>
      ) : null}

      {canAdd ? (
        <TouchableOpacity
          onPress={() => setIsPickerOpen(true)}
          activeOpacity={0.7}
          style={[styles.addButton, { borderColor: accent }]}
          accessibilityRole="button"
          accessibilityLabel={`${addLabel} for ${label}`}
        >
          <Plus size={15} color={colors.text} strokeWidth={2.5} />
          <Text style={[styles.addText, { color: colors.text }]}>{addLabel}</Text>
        </TouchableOpacity>
      ) : null}

      <MealPickerSheet
        visible={isPickerOpen}
        title={`${addLabel}: ${label}`}
        category={category}
        onPick={handlePick}
        onClose={() => setIsPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Rows split the spare height evenly, and never get too small to read
  row: { flexGrow: 1, minHeight: 84, justifyContent: 'center', gap: 8, padding: ROW_PADDING },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBubble: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: 15, fontWeight: '800' },
  countBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  countText: { fontSize: 11, fontWeight: '800' },
  emptyText: { fontSize: 13 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 10,
  },
  addText: { fontSize: 13, fontWeight: '800' },
});
