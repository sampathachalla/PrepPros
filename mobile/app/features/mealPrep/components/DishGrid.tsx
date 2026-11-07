import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Utensils } from 'lucide-react-native';
import { useCalendarColors } from '../../calendar/hooks/useCalendarColors';
import type { CatalogDish, HouseholdMember } from '../types/mealPlanner.types';
import { CatalogDishCard } from './CatalogDishCard';

export interface DishGridProps {
  dishes: CatalogDish[];
  members: HouseholdMember[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onSelectDish: (dish: CatalogDish) => void;
  selectedDishKeys?: Set<string>;
  requestedDishKeys?: Set<string>;
  assignedCountByDishKey?: Record<string, number>;
  emptyTitle?: string;
  emptySubtitle?: string;
  ListHeaderComponent?: React.ReactElement | null;
  ListFooterComponent?: React.ReactElement | null;
}

export function DishGrid({
  dishes,
  members,
  isLoading = false,
  isRefreshing = false,
  onRefresh,
  onSelectDish,
  selectedDishKeys,
  requestedDishKeys,
  assignedCountByDishKey,
  emptyTitle = 'No dishes match this view',
  emptySubtitle = 'Try another filter or add a new dish to your household catalog.',
  ListHeaderComponent,
  ListFooterComponent,
}: DishGridProps) {
  const colors = useCalendarColors();

  if (isLoading && dishes.length === 0) {
    return (
      <View style={styles.loadingWrap}>
        {ListHeaderComponent}
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={styles.spinner}
          accessibilityLabel="Loading dishes"
        />
      </View>
    );
  }

  return (
    <FlatList
      data={dishes}
      keyExtractor={(item) => item.dishKey}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={ListHeaderComponent ?? undefined}
      ListFooterComponent={ListFooterComponent ?? undefined}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        ) : undefined
      }
      renderItem={({ item }) => (
        <View style={styles.column}>
          <CatalogDishCard
            dish={item}
            members={members}
            onPress={onSelectDish}
            isSelected={selectedDishKeys?.has(item.dishKey) ?? false}
            isRequestedByHousehold={requestedDishKeys?.has(item.dishKey) ?? false}
            assignedSlotCount={assignedCountByDishKey?.[item.dishKey] ?? 0}
          />
        </View>
      )}
      ListEmptyComponent={
        <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.secondarySoft }]}>
            <Utensils size={22} color={colors.text} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{emptyTitle}</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>{emptySubtitle}</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
  },
  spinner: {
    marginTop: 56,
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 110,
    gap: 12,
  },
  row: {
    gap: 12,
  },
  column: {
    flex: 1,
    maxWidth: '48.8%',
  },
  emptyBox: {
    marginTop: 24,
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
});
