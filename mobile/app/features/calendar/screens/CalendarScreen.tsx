import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarDays, CalendarOff, Sparkles, Users } from 'lucide-react-native';
import { HeaderIconButton, useScreenHeader } from '@/app/shared';
import { NoticeBanner } from '@/app/shared/components/ui/NoticeBanner';
import { haptics } from '@/app/shared/services/haptics';
import { useHouseholdStore } from '../../household/store/householdStore';
import { DayMealsPanel } from '../components/DayMealsPanel';
import { WeekStrip } from '../components/WeekStrip';
import { useCalendar } from '../hooks/useCalendar';
import { useCalendarColors } from '../hooks/useCalendarColors';
import { formatDisplayDate } from '../utils/dateUtils';

/** The week across the top, and the selected day's meals filling the rest of the screen. */
export default function CalendarScreen() {
  const colors = useCalendarColors();
  const hasHousehold = useHouseholdStore((s) => s.household !== null);
  const householdError = useHouseholdStore((s) => s.loadError);
  const reloadHousehold = useHouseholdStore((s) => s.load);
  // Not while loading or after a failed load, when they may well be in a household
  const needsHousehold = useHouseholdStore((s) => s.household === null && !s.isLoading && !s.loadError);
  const router = useRouter();
  const {
    selectedDate,
    weekDays,
    loadError,
    selectDate,
    goToPrevious,
    goToNext,
    canGoToPreviousWeek,
    canGoToNextWeek,
  } = useCalendar();

  const [isWeekVisible, setIsWeekVisible] = useState(true);
  const headerActions = useMemo(
    () => (
      <View style={styles.headerActions}>
        <TouchableOpacity
          onPress={() => {
            haptics.selection();
            router.navigate('/(tabs)/meal-prep');
          }}
          style={[styles.planPill, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Open Meal Planner"
        >
          <Sparkles size={13} color={colors.text} />
          <Text style={[styles.planPillText, { color: colors.text }]}>Plan Week</Text>
        </TouchableOpacity>
        <HeaderIconButton
          label={isWeekVisible ? 'Hide calendar' : 'Show calendar'}
          onPress={() => {
            haptics.selection();
            setIsWeekVisible((visible) => !visible);
          }}
          icon={isWeekVisible ? CalendarDays : CalendarOff}
        />
      </View>
    ),
    [colors.border, colors.primarySoft, colors.text, isWeekVisible, router],
  );
  // With the week row hidden, the header is the only place left that says which day this is
  useScreenHeader({
    title: 'Calendar',
    subtitle: isWeekVisible ? undefined : formatDisplayDate(selectedDate),
    rightAction: headerActions,
  });

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

      {isWeekVisible ? (
        <WeekStrip
          days={weekDays}
          onSelectDate={selectDate}
          onPreviousWeek={goToPrevious}
          onNextWeek={goToNext}
          disablePrevious={!canGoToPreviousWeek}
          disableNext={!canGoToNextWeek}
        />
      ) : null}

      {householdError && !hasHousehold ? (
        <TouchableOpacity onPress={reloadHousehold} accessibilityRole="button">
          <Text style={[styles.banner, { color: colors.error }]} numberOfLines={2}>
            {householdError} Tap to try again.
          </Text>
        </TouchableOpacity>
      ) : null}

      {loadError ? (
        <Text style={[styles.banner, { color: colors.error }]} numberOfLines={2}>
          {loadError}
        </Text>
      ) : null}

      <DayMealsPanel
        dateKey={selectedDate}
        onSelectDate={selectDate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  planPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  banner: { fontSize: 12, fontWeight: '600', textAlign: 'center', paddingHorizontal: 16, paddingTop: 8 },
});
