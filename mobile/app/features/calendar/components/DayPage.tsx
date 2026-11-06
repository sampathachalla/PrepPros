import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { selectIsHouseholdAdmin, useHouseholdStore } from '../../household/store/householdStore';
import { MEAL_CATEGORIES } from '../constants/calendar';
import { useCalendarColors } from '../hooks/useCalendarColors';
import { useNow } from '../hooks/useNow';
import { EMPTY_CATEGORY_DISHES, useCalendarStore } from '../store/calendarStore';
import { getTodayDateKey } from '../utils/dateUtils';
import { dayPermissions } from '../utils/dayPlanUtils';
import { isPlanningEditable } from '../utils/planningHorizonUtils';
import type { AddDishPayload, DishActionResult } from '../types/calendar';
import { DayPlanBar } from './DayPlanBar';
import { MealSection } from './MealSection';

interface DayPageProps {
  dateKey: string;
  onAddDish: (payload: Omit<AddDishPayload, 'date'>) => Promise<DishActionResult>;
}

/**
 * One day in a box: its status, then a table with a row per meal. Takes all the height it is given and
 * shares it between the rows; it only scrolls once dishes need more room than the screen has.
 */
export function DayPage({ dateKey, onAddDish }: DayPageProps) {
  const colors = useCalendarColors();
  // Every second, so swipes stop the moment a timer runs out
  const now = useNow(1000);
  const hasHousehold = useHouseholdStore((s) => s.household !== null);
  const isHouseholdLoading = useHouseholdStore((s) => s.isLoading);
  const members = useHouseholdStore((s) => s.household?.members) ?? [];
  const myId = useHouseholdStore((s) => s.household?.myId) ?? '';
  const isAdmin = useHouseholdStore(selectIsHouseholdAdmin);
  const day = useCalendarStore((s) => s.dayStates[dateKey]);
  const dishes = useCalendarStore((s) => s.dishesByDate[dateKey]) ?? EMPTY_CATEGORY_DISHES;
  const isLoaded = useCalendarStore((s) => s.loadedDates[dateKey] === true);
  const loadError = useCalendarStore((s) => s.loadError);

  // Until the first answer comes back, an empty day only means nothing has arrived yet
  const isLoading = isHouseholdLoading || (hasHousehold && !isLoaded && !loadError);

  const isPast = dateKey < getTodayDateKey() || !isPlanningEditable(dateKey);
  const permissions = dayPermissions(day, isAdmin, isPast, now);
  const canAdd = permissions.canEditPlan || permissions.canSuggest;
  const hint = permissions.canAnswer
    ? canAdd
      ? 'Swipe a dish right to accept it, left to suggest another.'
      : 'Swipe a dish right to accept it.'
    : permissions.canEditPlan
      ? 'Swipe a dish left to add another. Hold it to remove it.'
      : null;

  return (
    <View style={[styles.page, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {hasHousehold && !isLoading ? <DayPlanBar dateKey={dateKey} isAdmin={isAdmin} /> : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.table, { borderColor: colors.border }]}>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} accessibilityLabel="Loading meals" />
          ) : (
            MEAL_CATEGORIES.map((category, index) => (
              <MealSection
                key={category.key}
                category={category.key}
                label={category.label}
                dishes={dishes[category.key] ?? []}
                members={members}
                myId={myId}
                permissions={permissions}
                onAddDish={onAddDish}
                showDivider={index > 0}
              />
            ))
          )}
        </View>

        {hint && !isLoading ? <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, margin: 12, padding: 10, borderWidth: 1, borderRadius: 16 },
  scroll: { flex: 1 },
  content: { flexGrow: 1, gap: 6 },
  table: { flexGrow: 1, borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  hint: { fontSize: 11, textAlign: 'center' },
  loading: { flex: 1 },
});
