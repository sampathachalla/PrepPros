import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChefHat } from 'lucide-react-native';
import { HeaderIconButton, useScreenHeader } from '@/app/shared';
import { haptics } from '@/app/shared/services/haptics';
import { useCalendarColors } from '../../calendar/hooks/useCalendarColors';
import { formatDisplayDate } from '../../calendar/utils/dateUtils';
import { PrepDishCard } from '../components/PrepDishCard';
import { PrepEmptyState } from '../components/PrepEmptyState';
import { PrepSummaryCard } from '../components/PrepSummaryCard';
import { PrepWeekHeader } from '../components/PrepWeekHeader';
import { ShoppingList } from '../components/ShoppingList';
import { useMealPrep } from '../hooks/useMealPrep';
import { useMealPlanner } from '../hooks/useMealPlanner';
import { DishLibraryScreen } from './DishLibraryScreen';
import { DishWeeklyPickerScreen } from './DishWeeklyPickerScreen';
import { MealSlotDetailsScreen } from './MealSlotDetailsScreen';
import { MyWeeklyReviewScreen } from './MyWeeklyReviewScreen';
import { ManageSlotsScreen } from './ManageSlotsScreen';
import { FinalizeWeeklyMenuScreen } from './FinalizeWeeklyMenuScreen';

const SCREEN_TITLES: Record<string, string> = {
  library: 'Meal Planner',
  'weekly-picker': 'Choose Meal Slots',
  'slot-details': 'Household Choices',
  'weekly-review': 'My Weekly Review',
  'manage-slots': 'Manage Meal Slots',
  'finalize-menu': 'Finalize Weekly Menu',
  'cook-shop': 'Cook & Shop List',
};

/**
 * Unified Meal Planner & Meal Prep entry point:
 * - Page 1: DishLibraryScreen ('library')
 * - Page 2: DishWeeklyPickerScreen ('weekly-picker')
 * - Page 3: MealSlotDetailsScreen ('slot-details')
 * - Page 4: MyWeeklyReviewScreen ('weekly-review')
 * - Page 5: ManageSlotsScreen ('manage-slots' — Admin)
 * - Page 6: FinalizeWeeklyMenuScreen ('finalize-menu' — Admin)
 * - Cook & Shop: finalized prep & grocery list ('cook-shop')
 */
export default function MealPrepScreen() {
  const colors = useCalendarColors();
  const prep = useMealPrep();
  const planner = useMealPlanner();
  const router = useRouter();

  const handleBack = useCallback(() => {
    haptics.selection();
    if (planner.activeScreen === 'slot-details') {
      planner.navigateTo('weekly-picker');
      return;
    }
    if (planner.activeScreen !== 'library') {
      planner.navigateTo('library');
      return;
    }
    router.navigate('/(tabs)/calendar');
  }, [planner, router]);

  const headerRight = useMemo(
    () => (
      <HeaderIconButton
        label={planner.activeScreen === 'cook-shop' ? 'Open Meal Planner' : 'Open Cook & Shop List'}
        icon={ChefHat}
        onPress={() => {
          haptics.selection();
          planner.navigateTo(planner.activeScreen === 'cook-shop' ? 'library' : 'cook-shop');
        }}
      />
    ),
    [planner],
  );

  useScreenHeader({
    title: SCREEN_TITLES[planner.activeScreen] ?? 'Meal Planner',
    showBack: true,
    onBack: handleBack,
    rightAction: headerRight,
  });

  if (planner.activeScreen === 'library') {
    return <DishLibraryScreen />;
  }
  if (planner.activeScreen === 'weekly-picker') {
    return <DishWeeklyPickerScreen />;
  }
  if (planner.activeScreen === 'slot-details') {
    return <MealSlotDetailsScreen />;
  }
  if (planner.activeScreen === 'weekly-review') {
    return <MyWeeklyReviewScreen />;
  }
  if (planner.activeScreen === 'manage-slots') {
    return <ManageSlotsScreen />;
  }
  if (planner.activeScreen === 'finalize-menu') {
    return <FinalizeWeeklyMenuScreen />;
  }

  const renderCookShopBody = () => {
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
      <View style={[styles.backToPlannerBar, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity
          onPress={() => {
            haptics.selection();
            planner.navigateTo('library');
          }}
          style={styles.backToPlannerBtn}
          accessibilityRole="button"
          accessibilityLabel="Back to Meal Planner"
        >
          <ArrowLeft size={15} color={colors.primary} />
          <Text style={[styles.backToPlannerText, { color: colors.primary }]}>Back to Dish Library & Slot Picker</Text>
        </TouchableOpacity>
      </View>
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
        {renderCookShopBody()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backToPlannerBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backToPlannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backToPlannerText: {
    fontSize: 13,
    fontWeight: '800',
  },
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 },
  loading: { paddingTop: 56 },
  error: { fontSize: 14, fontWeight: '600', textAlign: 'center', paddingTop: 48 },
  dayTitle: { fontSize: 14, fontWeight: '800', marginTop: 6, marginBottom: 8 },
});
