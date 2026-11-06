import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Apple, Moon, Plus, Sun, Utensils } from 'lucide-react-native';
import { haptics } from '@/app/shared/services/haptics';
import { useCalendarColors } from '../hooks/useCalendarColors';
import { MEAL_CATEGORY_COLORS } from '../constants/calendar';
import type { dayPermissions } from '../utils/dayPlanUtils';
import { countPeopleAnswered } from '../utils/householdUtils';
import type { HouseholdMember, MealCategory, ScheduledDish } from '../types/calendar';
import { DishCard } from './DishCard';

interface MealSectionProps {
  dateKey: string;
  category: MealCategory;
  label: string;
  dishes: ScheduledDish[];
  members: HouseholdMember[];
  myId: string;
  permissions: ReturnType<typeof dayPermissions>;
  /** Every row but the first draws the line separating it from the one above. */
  showDivider: boolean;
}

const CATEGORY_ICONS = { breakfast: Sun, lunch: Utensils, dinner: Moon, snacks: Apple } as const;

/** One meal's row: the dishes the admin has set. Its button opens this meal on the Plan tab. */
export function MealSection({
  dateKey,
  category,
  label,
  dishes,
  members,
  myId,
  permissions,
  showDivider,
}: MealSectionProps) {
  const router = useRouter();
  const colors = useCalendarColors();
  const accent = MEAL_CATEGORY_COLORS[category];
  const Icon = CATEGORY_ICONS[category];

  const canAdd = permissions.canEditPlan || permissions.canSuggest;
  const buttonLabel = permissions.canEditPlan ? 'Add' : 'Suggest';
  const approved = dishes.filter((dish) => dish.status === 'approved');
  const pendingCount = dishes.filter((dish) => dish.status === 'pending').length;
  const answered = countPeopleAnswered(members, approved);

  const openInPlan = () => {
    haptics.selection();
    router.navigate({ pathname: '/(tabs)/plan', params: { date: dateKey, meal: category } });
  };

  return (
    <View style={[styles.row, showDivider && { borderTopWidth: 1, borderTopColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconBubble, { backgroundColor: `${accent}33` }]}>
          <Icon size={15} color={accent} />
        </View>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>

        {approved.length > 0 ? (
          <View style={[styles.countBadge, { backgroundColor: `${accent}40` }]} accessibilityLabel={`${answered} of ${members.length} people answered`}>
            <Text style={[styles.countText, { color: colors.text }]}>
              {answered} of {members.length}
            </Text>
          </View>
        ) : null}

        {canAdd ? (
          <TouchableOpacity
            onPress={openInPlan}
            activeOpacity={0.7}
            hitSlop={6}
            style={[styles.button, { borderColor: accent }]}
            accessibilityRole="button"
            accessibilityLabel={`${buttonLabel} for ${label}${pendingCount > 0 ? `, ${pendingCount} waiting` : ''}`}
          >
            <Plus size={13} color={colors.text} strokeWidth={2.5} />
            <Text style={[styles.buttonText, { color: colors.text }]}>{buttonLabel}</Text>
            {pendingCount > 0 ? (
              <View style={[styles.pendingBadge, { backgroundColor: accent }]}>
                <Text style={[styles.pendingText, { color: colors.onPrimary }]}>{pendingCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ) : null}
      </View>

      {approved.map((dish) => (
        <DishCard key={dish.id} dish={dish} accent={accent} members={members} myId={myId} permissions={permissions} />
      ))}

      {approved.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {canAdd ? 'Nothing planned yet' : 'No dishes for this meal'}
        </Text>
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
  countBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  countText: { fontSize: 11, fontWeight: '800' },
  emptyText: { fontSize: 13 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
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
