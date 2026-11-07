import React, { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { haptics } from '@/app/shared/services/haptics';
import { useCalendarColors } from '../../calendar/hooks/useCalendarColors';
import type { PlannerSlotViewModel, SlotCoord } from '../types/mealPlanner.types';
import { formatShortDayLabel, getWeekDateKeys } from '../utils/mealPlanner.utils';
import { DailyMealCard } from './DailyMealCard';

export interface DailyReviewCarouselProps {
  weekStart: string;
  slots: Record<string, PlannerSlotViewModel>;
  onEditMealSlot: (coord: SlotCoord) => void;
}

export function DailyReviewCarousel({
  weekStart,
  slots,
  onEditMealSlot,
}: DailyReviewCarouselProps) {
  const colors = useCalendarColors();
  const { width } = useWindowDimensions();
  const cardWidth = Math.max(280, width - 28);
  const weekDates = useMemo(() => getWeekDateKeys(weekStart), [weekStart]);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<string>>(null);

  const jumpToDay = (index: number) => {
    haptics.selection();
    setActiveIndex(index);
    listRef.current?.scrollToIndex({ index, animated: true });
  };

  return (
    <View style={styles.container}>
      {/* Day Pill Selector Bar */}
      <View style={styles.dayPillsRow}>
        {weekDates.map((dateStr, index) => {
          const { dayName, dateNum } = formatShortDayLabel(dateStr);
          const selected = index === activeIndex;
          return (
            <Pressable
              key={dateStr}
              onPress={() => jumpToDay(index)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={[
                styles.dayPill,
                {
                  backgroundColor: selected ? colors.primary : colors.card,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.dayPillName,
                  { color: selected ? colors.onPrimary : colors.textMuted },
                ]}
              >
                {dayName}
              </Text>
              <Text
                style={[
                  styles.dayPillNum,
                  { color: selected ? colors.onPrimary : colors.text },
                ]}
              >
                {dateNum}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Horizontally Swipeable 7-Day Cards */}
      <FlatList
        ref={listRef}
        data={weekDates}
        keyExtractor={(item) => item}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + 12}
        decelerationRate="fast"
        contentContainerStyle={styles.carouselContent}
        getItemLayout={(_, index) => ({
          length: cardWidth + 12,
          offset: (cardWidth + 12) * index,
          index,
        })}
        onMomentumScrollEnd={(e) => {
          const nextIdx = Math.round(e.nativeEvent.contentOffset.x / (cardWidth + 12));
          if (nextIdx >= 0 && nextIdx < weekDates.length) {
            setActiveIndex(nextIdx);
          }
        }}
        renderItem={({ item }) => (
          <View style={{ width: cardWidth, marginRight: 12 }}>
            <DailyMealCard
              dateStr={item}
              slots={slots}
              onEditMealSlot={onEditMealSlot}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  dayPillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dayPill: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  dayPillName: {
    fontSize: 10,
    fontWeight: '700',
  },
  dayPillNum: {
    fontSize: 13,
    fontWeight: '800',
  },
  carouselContent: {
    paddingRight: 4,
  },
});
