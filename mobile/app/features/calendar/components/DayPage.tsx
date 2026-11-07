import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { CalendarClock, Clock, Sparkles, Users, UtensilsCrossed, X } from 'lucide-react-native';
import { haptics } from '@/app/shared/services/haptics';
import { selectIsHouseholdAdmin, useHouseholdStore } from '../../household/store/householdStore';
import { MEAL_CATEGORIES } from '../constants/calendar';
import { useCalendarColors } from '../hooks/useCalendarColors';
import { useNow } from '../hooks/useNow';
import { EMPTY_CATEGORY_DISHES, useCalendarStore } from '../store/calendarStore';
import { getTodayDateKey } from '../utils/dateUtils';
import { dayPermissions, findOwnDish } from '../utils/dayPlanUtils';
import { isPlanningEditable } from '../utils/planningHorizonUtils';
import type { MealCategory, ScheduledDish } from '../types/calendar';
import { DayPlanBar } from './DayPlanBar';
import { MealPickerSheet } from './MealPickerSheet';
import { MealSection } from './MealSection';

interface DayPageProps {
  dateKey: string;
}

/**
 * One day in a box: its status, then a table with a row per meal.
 * When a week/day is not yet finalized, shows a clear "Menu not finalized" callout with a link
 * to the collaborative Meal Planner. Tapping a dish opens its Dish Details sheet.
 */
export function DayPage({ dateKey }: DayPageProps) {
  const colors = useCalendarColors();
  const router = useRouter();
  const [openMeal, setOpenMeal] = useState<MealCategory | null>(null);
  const [inspectedDish, setInspectedDish] = useState<ScheduledDish | null>(null);
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
  const openMealLabel = MEAL_CATEGORIES.find(({ key }) => key === openMeal)?.label;
  const openMealDishes = openMeal ? dishes[openMeal] ?? [] : [];
  const isFinalized = day?.status === 'fixed';
  const totalApprovedCount = MEAL_CATEGORIES.reduce(
    (sum, cat) => sum + (dishes[cat.key]?.filter((d) => d.status === 'approved').length ?? 0),
    0,
  );

  const hint = permissions.canAnswer
    ? 'Tap a dish to choose it, or tap the info icon for recipe details.'
    : permissions.canEditPlan
      ? 'Tap a dish for details • Hold a dish to remove it.'
      : 'Tap any dish to view ingredients and cooking steps.';

  return (
    <View style={[styles.page, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {hasHousehold && !isLoading ? <DayPlanBar dateKey={dateKey} isAdmin={isAdmin} /> : null}

      {hasHousehold && !isLoading && !isFinalized && totalApprovedCount === 0 ? (
        <View style={[styles.unfinalizedCard, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          <View style={styles.unfinalizedTop}>
            <View style={[styles.unfinalizedIconWrap, { backgroundColor: colors.primarySoft }]}>
              <CalendarClock size={18} color={colors.text} />
            </View>
            <View style={styles.unfinalizedCopy}>
              <Text style={[styles.unfinalizedTitle, { color: colors.text }]}>Menu not finalized</Text>
              <Text style={[styles.unfinalizedSub, { color: colors.textMuted }]}>
                Plan your dishes and submit your weekly choices in Meal Planner.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              haptics.selection();
              router.navigate('/(tabs)/meal-prep');
            }}
            style={[styles.openPlannerBtn, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Open Meal Planner"
          >
            <Sparkles size={14} color={colors.onPrimary} />
            <Text style={[styles.openPlannerBtnText, { color: colors.onPrimary }]}>Open Meal Planner</Text>
          </TouchableOpacity>
        </View>
      ) : null}

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
                showDivider={index > 0}
                onAdd={() => setOpenMeal(category.key)}
                onInspectDish={(dish) => setInspectedDish(dish)}
              />
            ))
          )}
        </View>

        {hint && !isLoading ? <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text> : null}
      </ScrollView>

      <MealPickerSheet
        meal={openMeal}
        title={
          findOwnDish(openMealDishes, myId)
            ? `Update ${openMealLabel}`
            : isAdmin
              ? `Add to ${openMealLabel}`
              : `Suggest for ${openMealLabel}`
        }
        date={dateKey}
        dishes={openMealDishes}
        members={members}
        myId={myId}
        canAnswer={permissions.canAnswer}
        onClose={() => setOpenMeal(null)}
      />

      <Modal
        visible={inspectedDish !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setInspectedDish(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {inspectedDish ? (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleCol}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>{inspectedDish.name}</Text>
                    <View style={styles.modalMetaRow}>
                      {(inspectedDish.prepMinutes ?? 0) + (inspectedDish.cookMinutes ?? 0) > 0 ? (
                        <View style={[styles.metaChip, { backgroundColor: colors.inputBackground }]}>
                          <Clock size={12} color={colors.textMuted} />
                          <Text style={[styles.metaChipText, { color: colors.text }]}>
                            {(inspectedDish.prepMinutes ?? 0) + (inspectedDish.cookMinutes ?? 0)} min
                          </Text>
                        </View>
                      ) : null}
                      <View style={[styles.metaChip, { backgroundColor: colors.inputBackground }]}>
                        <Users size={12} color={colors.textMuted} />
                        <Text style={[styles.metaChipText, { color: colors.text }]}>
                          {Math.max(inspectedDish.memberIds.length, inspectedDish.baseServings ?? 1)} servings
                        </Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setInspectedDish(null)}
                    style={[styles.closeBtn, { backgroundColor: colors.inputBackground }]}
                    accessibilityRole="button"
                    accessibilityLabel="Close dish details"
                  >
                    <X size={18} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
                  {inspectedDish.imageUrl ? (
                    <Image
                      source={{ uri: inspectedDish.imageUrl }}
                      style={styles.heroImage}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : null}

                  {inspectedDish.notes ? (
                    <View style={[styles.notesCard, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                      <Text style={[styles.notesText, { color: colors.text }]}>{inspectedDish.notes}</Text>
                    </View>
                  ) : null}

                  <View style={styles.sectionBlock}>
                    <Text style={[styles.sectionHeading, { color: colors.text }]}>Ingredients</Text>
                    {inspectedDish.ingredients && inspectedDish.ingredients.length > 0 ? (
                      inspectedDish.ingredients.map((item, idx) => (
                        <View key={`${idx}-${item}`} style={styles.bulletRow}>
                          <View style={[styles.bulletDot, { backgroundColor: colors.primary }]} />
                          <Text style={[styles.bulletText, { color: colors.text }]}>{item}</Text>
                        </View>
                      ))
                    ) : (
                      <View style={[styles.emptyDetailBox, { backgroundColor: colors.inputBackground }]}>
                        <UtensilsCrossed size={14} color={colors.textMuted} />
                        <Text style={[styles.emptyDetailText, { color: colors.textMuted }]}>
                          No structured ingredient list saved for this dish yet.
                        </Text>
                      </View>
                    )}
                  </View>

                  {inspectedDish.steps && inspectedDish.steps.length > 0 ? (
                    <View style={styles.sectionBlock}>
                      <Text style={[styles.sectionHeading, { color: colors.text }]}>Preparation Steps</Text>
                      {inspectedDish.steps.map((step, idx) => (
                        <View key={`${idx}-${step.slice(0, 16)}`} style={styles.stepRow}>
                          <View style={[styles.stepNumber, { backgroundColor: colors.primarySoft }]}>
                            <Text style={[styles.stepNumberText, { color: colors.text }]}>{idx + 1}</Text>
                          </View>
                          <Text style={[styles.stepText, { color: colors.text }]}>{step}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </ScrollView>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, margin: 12, padding: 10, borderWidth: 1, borderRadius: 16, gap: 8 },
  unfinalizedCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  unfinalizedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  unfinalizedIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unfinalizedCopy: {
    flex: 1,
    gap: 2,
  },
  unfinalizedTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  unfinalizedSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  openPlannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 38,
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  openPlannerBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  scroll: { flex: 1 },
  content: { flexGrow: 1, gap: 6 },
  table: { flexGrow: 1, borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  hint: { fontSize: 11, textAlign: 'center' },
  loading: { flex: 1 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '82%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalTitleCol: {
    flex: 1,
    gap: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    gap: 14,
    paddingBottom: 24,
  },
  heroImage: {
    width: '100%',
    height: 180,
    borderRadius: 16,
  },
  notesCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  emptyDetailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  emptyDetailText: {
    flex: 1,
    fontSize: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: '800',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
});
