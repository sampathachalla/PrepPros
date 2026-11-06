import React, { useCallback } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useScreenHeader } from '@/app/shared';
import { useCalendarColors } from '../../calendar/hooks/useCalendarColors';
import { formatDisplayDate } from '../../calendar/utils/dateUtils';
import { PrepDishCard } from '../components/PrepDishCard';
import { PrepEmptyState } from '../components/PrepEmptyState';
import { PrepSummaryCard } from '../components/PrepSummaryCard';
import { PrepWeekHeader } from '../components/PrepWeekHeader';
import { ShoppingList } from '../components/ShoppingList';
import { useMealPrep } from '../hooks/useMealPrep';

/** What to cook and buy for the week, worked out from the days the household fixed. */
export default function MealPrepScreen() {
  const colors = useCalendarColors();
  const prep = useMealPrep();
  const router = useRouter();
  const backToChat = useCallback(() => router.navigate('/(tabs)/chat'), [router]);
  useScreenHeader({ title: 'Meal Prep', showBack: true, onBack: backToChat });

  const renderBody = () => {
    if (!prep.hasHousehold) {
      return (
        <PrepEmptyState
          title="Plan with your household"
          message="Start or join a household, and your meal prep will build itself here."
          needsHousehold
        />
      );
    }
    if (prep.isLoading) {
      return <ActivityIndicator color={colors.primary} style={styles.loading} accessibilityLabel="Loading meal prep" />;
    }
    if (prep.loadError && prep.summary.dishCount === 0) {
      return <Text style={[styles.error, { color: colors.error }]}>{prep.loadError}</Text>;
    }
    if (prep.summary.dishCount === 0) {
      return (
        <PrepEmptyState
          title="Nothing to prep yet"
          message={
            prep.undecidedDayCount > 0
              ? `${prep.undecidedDayCount} ${prep.undecidedDayCount === 1 ? 'day is' : 'days are'} still being decided. Dishes appear here once a day is fixed.`
              : 'When the household fixes a day on the calendar, its dishes appear here with servings and a shopping list.'
          }
        />
      );
    }
    if (prep.view === 'shop') {
      return <ShoppingList items={prep.shopping} progress={prep.shoppingProgress} onToggle={prep.toggleShoppingItem} />;
    }
    return (
      <>
        <PrepSummaryCard summary={prep.summary} undecidedDayCount={prep.undecidedDayCount} />
        {prep.days.map((day) => (
          <View key={day.date}>
            <Text style={[styles.dayTitle, { color: colors.text }]}>{formatDisplayDate(day.date)}</Text>
            {day.dishes.map((dish) => (
              <PrepDishCard
                key={dish.id}
                dish={dish}
                members={prep.members}
                myId={prep.myId}
                onToggleStatus={prep.toggleStatus}
                onToggleCook={prep.toggleCook}
              />
            ))}
          </View>
        ))}
      </>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <PrepWeekHeader
        title={prep.title}
        view={prep.view}
        onChangeView={prep.setView}
        onPrevious={prep.goToPreviousWeek}
        onNext={prep.goToNextWeek}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={prep.isRefreshing} onRefresh={prep.refresh} tintColor={colors.primary} />
        }
      >
        {renderBody()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 },
  loading: { paddingTop: 56 },
  error: { fontSize: 14, fontWeight: '600', textAlign: 'center', paddingTop: 48 },
  dayTitle: { fontSize: 14, fontWeight: '800', marginTop: 6, marginBottom: 8 },
});
