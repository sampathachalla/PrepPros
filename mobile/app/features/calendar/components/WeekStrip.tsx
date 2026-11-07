import React, { useCallback, useMemo } from 'react';
import { PanResponder, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { haptics } from '@/app/shared/services/haptics';
import { useCalendarColors } from '../hooks/useCalendarColors';
import type { DayItem } from '../utils/dateUtils';
import { dragDirection } from '../utils/swipeUtils';

interface WeekStripProps {
  days: DayItem[];
  onSelectDate: (dateStr: string) => void;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  disablePrevious?: boolean;
  disableNext: boolean;
}

const SWIPE_CHANGE_WEEK_PX = 40;
const HIT_SLOP = { top: 10, bottom: 10, left: 6, right: 6 };
const STRIP_SHADOW = { light: '#A8DDF5', dark: '#000000' } as const;

/** The week under the page header, between its arrows: today is filled in, the selected day tinted. */
export function WeekStrip({
  days,
  onSelectDate,
  onPreviousWeek,
  onNextWeek,
  disablePrevious = false,
  disableNext,
}: WeekStripProps) {
  const colors = useCalendarColors();

  const goToPreviousWeek = useCallback(() => {
    if (disablePrevious) return;
    haptics.selection();
    onPreviousWeek();
  }, [disablePrevious, onPreviousWeek]);

  const goToNextWeek = useCallback(() => {
    if (disableNext) return;
    haptics.selection();
    onNextWeek();
  }, [disableNext, onNextWeek]);

  const selectDay = (day: DayItem) => {
    if (!day.isSelected) haptics.selection();
    onSelectDate(day.dateString);
  };

  const swipe = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponderCapture: () => false,
        // Only clearly sideways drags count, so tapping a day still selects it
        onMoveShouldSetPanResponder: (_, { dx, dy }) => dragDirection(dx, dy) !== null,
        onPanResponderTerminationRequest: () => true,
        onPanResponderRelease: (_, { dx }) => {
          if (dx <= -SWIPE_CHANGE_WEEK_PX) goToNextWeek();
          else if (dx >= SWIPE_CHANGE_WEEK_PX) goToPreviousWeek();
        },
      }),
    [goToNextWeek, goToPreviousWeek],
  );

  const stripShadow = Platform.select({
    ios: {
      shadowColor: colors.isDark ? STRIP_SHADOW.dark : STRIP_SHADOW.light,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: colors.isDark ? 0.45 : 0.14,
      shadowRadius: 14,
    },
    android: { elevation: colors.isDark ? 6 : 3 },
    default: {},
  });

  return (
    <View
      style={[
        styles.strip,
        stripShadow,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <TouchableOpacity
        onPress={goToPreviousWeek}
        disabled={disablePrevious}
        accessibilityRole="button"
        accessibilityLabel="Previous week"
        accessibilityState={{ disabled: disablePrevious }}
        hitSlop={HIT_SLOP}
        style={[
          styles.arrow,
          styles.arrowInteractive,
          {
            backgroundColor: colors.secondarySoft,
            borderColor: colors.border,
          },
          disablePrevious && styles.arrowDisabled,
        ]}
      >
        <ChevronLeft size={18} color={disablePrevious ? colors.textMuted : colors.secondary} strokeWidth={2.5} />
      </TouchableOpacity>

      <View style={styles.daysRow} {...swipe.panHandlers}>
        {days.map((day) => {
          const { isToday, isSelected } = day;

          return (
            <TouchableOpacity
              key={day.dateString}
              onPress={() => selectDay(day)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${day.dayName} ${day.dayNumber}${isToday ? ', today' : ''}`}
              style={[
                styles.day,
                isToday && { backgroundColor: colors.primary },
                isSelected && !isToday && {
                  backgroundColor: colors.primarySoft,
                  borderColor: colors.primary,
                },
                isToday && isSelected && {
                  borderColor: colors.secondary,
                },
              ]}
            >
              <Text
                style={[
                  styles.dayName,
                  {
                    color: isToday ? colors.onPrimary : isSelected ? colors.primary : colors.textMuted,
                  },
                ]}
              >
                {day.dayName}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  { color: isToday ? colors.onPrimary : colors.text },
                  isSelected && !isToday && styles.dayNumberSelected,
                ]}
              >
                {day.dayNumber}
              </Text>
              {isSelected && !isToday ? (
                <View style={[styles.selectedDot, { backgroundColor: colors.primary }]} />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        onPress={goToNextWeek}
        disabled={disableNext}
        accessibilityRole="button"
        accessibilityLabel="Next week"
        accessibilityState={{ disabled: disableNext }}
        hitSlop={HIT_SLOP}
        style={[
          styles.arrow,
          styles.arrowInteractive,
          {
            backgroundColor: colors.secondarySoft,
            borderColor: colors.border,
          },
          disableNext && styles.arrowDisabled,
        ]}
      >
        <ChevronRight size={18} color={disableNext ? colors.textMuted : colors.secondary} strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginHorizontal: 12,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderRadius: 22,
  },
  daysRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    zIndex: 0,
  },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowInteractive: {
    zIndex: 2,
    elevation: 3,
  },
  arrowDisabled: { opacity: 0.35 },
  day: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 52,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: 14,
  },
  dayName: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  dayNumberSelected: {
    fontSize: 17,
  },
  selectedDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
  },
});
