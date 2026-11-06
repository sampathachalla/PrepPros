import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CheckCircle2, Clock, PencilLine, Play, Square } from 'lucide-react-native';
import { ApiError } from '@/app/shared/services/apiClient';
import { useCalendarStore } from '../store/calendarStore';
import { useCalendarColors } from '../hooks/useCalendarColors';
import { useNow } from '../hooks/useNow';
import { dayPermissions, formatTimeLeft, isDayFixed, isTimerRunning } from '../utils/dayPlanUtils';
import { getTodayDateKey, getWeekDays } from '../utils/dateUtils';
import { countPlannedMeals } from '../utils/householdUtils';
import { StartTimerModal } from './StartTimerModal';

interface DayPlanBarProps {
  dateKey: string;
  isAdmin: boolean;
}

/** Top of an open day: where it stands, and for the admin, the timer controls. */
export function DayPlanBar({ dateKey, isAdmin }: DayPlanBarProps) {
  const colors = useCalendarColors();
  const now = useNow(1000);
  const day = useCalendarStore((s) => s.dayStates[dateKey]);
  const dishesByDate = useCalendarStore((s) => s.dishesByDate);
  const dayStates = useCalendarStore((s) => s.dayStates);
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);

  const today = getTodayDateKey();
  const isPast = dateKey < today;
  const running = isTimerRunning(day, now);
  const fixed = isDayFixed(day, now);
  const permissions = dayPermissions(day, isAdmin, isPast, now);
  const hasDishes = countPlannedMeals(dishesByDate[dateKey]) > 0;

  // Other days this week that are planned but not yet sent out
  const otherReadyDays = getWeekDays(dateKey, dateKey)
    .map((item) => item.dateString)
    .filter(
      (date) =>
        date !== dateKey &&
        date >= today &&
        dayStates[date]?.status === 'draft' &&
        countPlannedMeals(dishesByDate[date]) > 0,
    );

  const endTimer = () =>
    Alert.alert('End the timer now?', 'The plan becomes final and people can’t answer any more.', [
      { text: 'Keep it running', style: 'cancel' },
      {
        text: 'End now',
        style: 'destructive',
        onPress: () =>
          useCalendarStore
            .getState()
            .fixDay(dateKey)
            .catch((error) =>
              Alert.alert('That didn’t work', error instanceof ApiError ? error.message : 'Please try again.'),
            ),
      },
    ]);

  const message = running
    ? `${formatTimeLeft(day!.votingEndsAt!, now)} to answer`
    : fixed
      ? 'This day is fixed'
      : isPast
        ? 'This day has passed'
        : isAdmin
          ? hasDishes
            ? 'Only you can see this until you fix it or start the timer'
            : 'Choose the dishes for each meal, then start the timer'
          : 'The admin is planning this day. You can still pick from the Plan tab.';

  const Icon = running ? Clock : fixed ? CheckCircle2 : PencilLine;

  return (
    <View style={[styles.bar, { backgroundColor: colors.secondarySoft }]}>
      <View style={styles.messageRow}>
        <Icon size={15} color={colors.text} />
        <Text style={[styles.message, { color: colors.text }]} numberOfLines={2}>
          {message}
        </Text>
      </View>

      {permissions.canStartTimer && hasDishes ? (
        <TouchableOpacity
          onPress={() => setIsTimerModalOpen(true)}
          style={[styles.button, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
        >
          <Play size={12} color={colors.onPrimary} fill={colors.onPrimary} />
          <Text style={[styles.buttonText, { color: colors.onPrimary }]}>{fixed ? 'Reopen' : 'Fix meals'}</Text>
        </TouchableOpacity>
      ) : null}

      {permissions.canEndTimer ? (
        <TouchableOpacity
          onPress={endTimer}
          style={[styles.button, { borderColor: colors.border, borderWidth: 1 }]}
          accessibilityRole="button"
        >
          <Square size={11} color={colors.text} />
          <Text style={[styles.buttonText, { color: colors.text }]}>End now</Text>
        </TouchableOpacity>
      ) : null}

      <StartTimerModal
        visible={isTimerModalOpen}
        dateKey={dateKey}
        otherDates={otherReadyDays}
        canFixNow={!fixed}
        onClose={() => setIsTimerModalOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
  },
  messageRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  message: { flex: 1, fontSize: 12, fontWeight: '700' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  buttonText: { fontSize: 12, fontWeight: '800' },
});

