import React, { useCallback, useMemo } from 'react';
import { PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  disableNext: boolean;
}

const SWIPE_CHANGE_WEEK_PX = 40;
const HIT_SLOP = { top: 10, bottom: 10, left: 6, right: 6 };

/** The week under the page header, between its arrows: today is filled in, the selected day tinted. */
export function WeekStrip({ days, onSelectDate, onPreviousWeek, onNextWeek, disableNext }: WeekStripProps) {
  const colors = useCalendarColors();

  const goToPreviousWeek = useCallback(() => {
    haptics.selection();
    onPreviousWeek();
  }, [onPreviousWeek]);

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
        // Only clearly sideways drags count, so tapping a day still selects it
        onMoveShouldSetPanResponder: (_, { dx, dy }) => dragDirection(dx, dy) !== null,
        onPanResponderRelease: (_, { dx }) => {
          if (dx <= -SWIPE_CHANGE_WEEK_PX) goToNextWeek();
          else if (dx >= SWIPE_CHANGE_WEEK_PX) goToPreviousWeek();
        },
      }),
    [goToNextWeek, goToPreviousWeek],
  );

  const arrowStyle = { backgroundColor: colors.secondarySoft };

  return (
    <View style={[styles.strip, { backgroundColor: colors.card, borderColor: colors.border }]} {...swipe.panHandlers}>
      <TouchableOpacity
        onPress={goToPreviousWeek}
        accessibilityRole="button"
        accessibilityLabel="Previous week"
        hitSlop={HIT_SLOP}
        style={[styles.arrow, arrowStyle]}
      >
        <ChevronLeft size={18} color={colors.secondary} />
      </TouchableOpacity>

      {days.map((day) => {
        const { isToday, isSelected } = day;

        return (
          <TouchableOpacity
            key={day.dateString}
            onPress={() => selectDay(day)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${day.dayName} ${day.dayNumber}${isToday ? ', today' : ''}`}
            style={[
              styles.day,
              isToday && { backgroundColor: colors.primary },
              isSelected && !isToday && { backgroundColor: colors.primarySoft, borderColor: colors.primary },
            ]}
          >
            <Text style={[styles.dayName, { color: isToday ? colors.onPrimary : colors.textMuted }]}>
              {day.dayName}
            </Text>
            <Text style={[styles.dayNumber, { color: isToday ? colors.onPrimary : colors.text }]}>
              {day.dayNumber}
            </Text>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        onPress={goToNextWeek}
        disabled={disableNext}
        accessibilityRole="button"
        accessibilityLabel="Next week"
        accessibilityState={{ disabled: disableNext }}
        hitSlop={HIT_SLOP}
        style={[styles.arrow, arrowStyle, disableNext && styles.arrowDisabled]}
      >
        <ChevronRight size={18} color={disableNext ? colors.textMuted : colors.secondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // Same margin, border and corners as the meals box below, so the two read as one page
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginHorizontal: 12,
    marginTop: 12,
    padding: 6,
    borderWidth: 1,
    borderRadius: 16,
  },
  arrow: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  arrowDisabled: { opacity: 0.35 },
  day: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 12,
  },
  dayName: { fontSize: 11, fontWeight: '600' },
  dayNumber: { fontSize: 15, fontWeight: '800' },
});
