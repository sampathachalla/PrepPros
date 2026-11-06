import React from 'react';
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { haptics } from '@/app/shared/services/haptics';
import { addDays } from '../utils/dateUtils';
import { isPlanningEditable } from '../utils/planningHorizonUtils';
import { swipedPage } from '../utils/swipeUtils';
import { DayPage } from './DayPage';

interface DayMealsPanelProps {
  dateKey: string;
  onSelectDate: (dateStr: string) => void;
}

/**
 * The selected day with the days either side, in a native paging scroller: the phone moves the pages,
 * so a card follows the finger.
 *
 * The row is rebuilt for each day, keyed by date, opening centred through its starting offset. Moving
 * it with `scrollTo` doesn't work here: on a phone the call has no effect, the row stays at the edge it
 * landed on, and swiping stops after one day.
 */
export function DayMealsPanel({ dateKey, onSelectDate }: DayMealsPanelProps) {
  const { width } = useWindowDimensions();

  const previousDay = addDays(dateKey, -1);
  const nextDay = addDays(dateKey, 1);
  const canGoToNextDay = isPlanningEditable(nextDay);
  const pages = [previousDay, dateKey, ...(canGoToNextDay ? [nextDay] : [])];

  const handleSwipeEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = swipedPage(event.nativeEvent.contentOffset.x, width);
    if (page === 0 || (page === 1 && !canGoToNextDay)) return;
    haptics.selection();
    onSelectDate(page === -1 ? previousDay : nextDay);
  };

  return (
    <ScrollView
      key={`${dateKey}-${width}`}
      style={styles.row}
      horizontal
      pagingEnabled
      directionalLockEnabled
      bounces={false}
      showsHorizontalScrollIndicator={false}
      contentOffset={{ x: width, y: 0 }}
      onMomentumScrollEnd={handleSwipeEnd}
    >
      {pages.map((date) => (
        <View key={date} style={{ width }}>
          <DayPage dateKey={date} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1 },
});
