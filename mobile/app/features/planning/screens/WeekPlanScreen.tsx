import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarPlus, Copy, Inbox, Users } from 'lucide-react-native';
import { useScreenHeader } from '@/app/shared';
import { NoticeBanner } from '@/app/shared/components/ui/NoticeBanner';
import { TabSwitch } from '@/app/shared/components/ui/TabSwitch';
import { haptics } from '@/app/shared/services/haptics';
import { DayPlanBar } from '../../calendar/components/DayPlanBar';
import { WeekStrip } from '../../calendar/components/WeekStrip';
import { MEAL_CATEGORIES } from '../../calendar/constants/calendar';
import { useCalendarColors } from '../../calendar/hooks/useCalendarColors';
import { useNow } from '../../calendar/hooks/useNow';
import { EMPTY_CATEGORY_DISHES, useCalendarStore } from '../../calendar/store/calendarStore';
import { addDays, getTodayDateKey } from '../../calendar/utils/dateUtils';
import { dayPermissions, isDayFixed } from '../../calendar/utils/dayPlanUtils';
import { isPlanningEditable } from '../../calendar/utils/planningHorizonUtils';
import { selectIsHouseholdAdmin, useHouseholdStore } from '../../household/store/householdStore';
import { PlanDishSheet } from '../components/PlanDishSheet';
import { PlanMealRow } from '../components/PlanMealRow';
import { SuggestionsList } from '../components/SuggestionsList';
import { useWeekPlan } from '../hooks/useWeekPlan';
import { picksToCopy } from '../utils/planUtils';

type PlanView = 'plan' | 'suggestions';

/**
 * One page for planning a week. Everyone sees the same days and meals, and the role decides what a
 * meal offers: members pick what they'd like, and the admin builds the plan and answers those picks.
 */
export default function WeekPlanScreen() {
  useScreenHeader({ title: 'Plan' });
  const colors = useCalendarColors();
  const router = useRouter();
  const now = useNow(1000);
  const plan = useWeekPlan();
  const { date, weekDays, weekDates, suggestions, openMeal, setOpenMeal } = plan;

  const [view, setView] = useState<PlanView>('plan');
  const needsHousehold = useHouseholdStore((s) => s.household === null && !s.isLoading && !s.loadError);
  const myId = useHouseholdStore((s) => s.household?.myId) ?? '';
  const isAdmin = useHouseholdStore(selectIsHouseholdAdmin);
  const day = useCalendarStore((s) => s.dayStates[date]);
  const dayStates = useCalendarStore((s) => s.dayStates);
  const dishes = useCalendarStore((s) => s.dishesByDate[date]) ?? EMPTY_CATEGORY_DISHES;
  const dishesByDate = useCalendarStore((s) => s.dishesByDate);
  const copyPicks = useCalendarStore((s) => s.copyPicks);

  const today = getTodayDateKey();
  const isPast = date < today || !isPlanningEditable(date);
  const permissions = dayPermissions(day, isAdmin, isPast, now);
  const openMealLabel = MEAL_CATEGORIES.find(({ key }) => key === openMeal)?.label ?? '';

  // The admin can add a dish to several days at once
  const otherDays = isAdmin
    ? weekDays.filter(
        ({ dateString }) => dateString !== date && dateString >= today && !isDayFixed(dayStates[dateString], now),
      )
    : [];

  const copyLastWeek = async () => {
    const picks = picksToCopy(dishesByDate, weekDates.map((key) => addDays(key, -7)), myId);
    if (picks.length === 0) {
      Alert.alert('Nothing to copy', 'You didn’t pick anything last week.');
      return;
    }
    const copied = await copyPicks(picks);
    haptics.success();
    Alert.alert('Picks copied', `${copied} of ${picks.length} added to this week.`);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {needsHousehold ? (
        <NoticeBanner
          icon={Users}
          message="Start or join a household to plan your meals"
          actionLabel="Get started"
          onAction={() => router.navigate({ pathname: '/(tabs)/profile', params: { view: 'people' } })}
        />
      ) : null}

      <WeekStrip
        days={weekDays}
        onSelectDate={plan.selectDate}
        onPreviousWeek={plan.goToPreviousWeek}
        onNextWeek={plan.goToNextWeek}
        disableNext={!plan.canGoToNextWeek}
      />

      {isAdmin ? (
        <TabSwitch
          tabs={[
            { key: 'plan', label: 'Plan meals', icon: CalendarPlus },
            {
              key: 'suggestions',
              label: suggestions.length > 0 ? `Suggestions ${suggestions.length}` : 'Suggestions',
              icon: Inbox,
            },
          ]}
          selected={view}
          onSelect={setView}
        />
      ) : null}

      {isAdmin && view === 'suggestions' ? (
        <SuggestionsList suggestions={suggestions} myId={myId} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {needsHousehold ? null : <DayPlanBar dateKey={date} isAdmin={isAdmin} />}

          <View style={[styles.table, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {MEAL_CATEGORIES.map(({ key, label }, index) => (
              <PlanMealRow
                key={key}
                category={key}
                label={label}
                dishes={dishes[key] ?? []}
                myId={myId}
                permissions={permissions}
                showDivider={index > 0}
                onAdd={() => setOpenMeal(key)}
              />
            ))}
          </View>

          {!isAdmin && !needsHousehold ? (
            <TouchableOpacity
              onPress={copyLastWeek}
              activeOpacity={0.7}
              style={[styles.copyButton, { borderColor: colors.border }]}
              accessibilityRole="button"
            >
              <Copy size={14} color={colors.text} />
              <Text style={[styles.copyText, { color: colors.text }]}>Copy last week’s picks</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      )}

      <PlanDishSheet
        meal={openMeal}
        title={`${isAdmin ? 'Add to' : 'Pick for'} ${openMealLabel}`}
        date={date}
        otherDays={otherDays}
        onClose={() => setOpenMeal(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: 10, padding: 12, paddingBottom: 32 },
  table: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 11,
  },
  copyText: { fontSize: 13, fontWeight: '800' },
});
