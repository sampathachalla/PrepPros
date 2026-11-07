import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Heart,
  Lock,
  Plus,
  Search,
  Sparkles,
  UtensilsCrossed,
  Wand2,
  X,
} from 'lucide-react-native';
import { ApiError } from '@/app/shared/services/apiClient';
import { haptics } from '@/app/shared/services/haptics';
import { useCalendarColors } from '../../calendar/hooks/useCalendarColors';
import { CreateRecipeModal } from '../../recipes/components/CreateRecipeModal';
import { recipeService } from '../../recipes/services/recipeService';
import type { CreateRecipeInput } from '../../recipes/types/recipes';
import { DishGrid } from '../components/DishGrid';
import { useMealPlanner } from '../hooks/useMealPlanner';
import type { CatalogDish, DishCatalogFilter } from '../types/mealPlanner.types';

const FILTERS: { key: DishCatalogFilter; label: string; Icon: typeof Heart }[] = [
  { key: 'liked', label: 'Liked', Icon: Heart },
  { key: 'recently_added', label: 'Recently Added', Icon: Clock3 },
  { key: 'suggested', label: 'Suggested', Icon: Sparkles },
];

export function DishLibraryScreen() {
  const colors = useCalendarColors();
  const planner = useMealPlanner();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleSelectDish = (dish: CatalogDish) => {
    planner.navigateTo('weekly-picker', { dish });
  };

  const handleCreateRecipe = async (
    input: CreateRecipeInput,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const created = await recipeService.create(input);
      await planner.refreshAll();
      haptics.success();
      const catalogDish: CatalogDish = {
        dishKey: `recipe:${created.id}`,
        name: created.title,
        imageUrl: created.imageUrl,
        minutes: created.prepTimeMinutes + (created.cookTimeMinutes ?? 0),
        recipeId: created.id,
        isLiked: false,
        isRecentlyAdded: true,
        isSuggested: false,
        interestedMemberIds: [planner.myId],
      };
      planner.navigateTo('weekly-picker', { dish: catalogDish });
      return { success: true };
    } catch (error) {
      haptics.error();
      return {
        success: false,
        error: error instanceof ApiError ? error.message : 'Could not create dish.',
      };
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Hero Planning Week Banner */}
      <View
        style={[
          styles.heroBanner,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.heroTitleCol}>
            <Text style={[styles.heroHeadline, { color: colors.text }]}>Choose your dishes</Text>
            <View style={styles.weekSelectorRow}>
              <Pressable
                onPress={() => {
                  haptics.selection();
                  planner.shiftWeek(-1);
                }}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Previous week"
              >
                <ChevronLeft size={18} color={colors.secondary} />
              </Pressable>
              <Text style={[styles.weekSubhead, { color: colors.textMuted }]}>
                Plan for {planner.weekTitle}
              </Text>
              <Pressable
                onPress={() => {
                  haptics.selection();
                  planner.shiftWeek(1);
                }}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Next week"
              >
                <ChevronRight size={18} color={colors.secondary} />
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={() => {
              haptics.selection();
              setIsCreateModalOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Add new dish"
            style={({ pressed }) => [
              styles.addDishPill,
              { backgroundColor: colors.primary },
              pressed && styles.pressed,
            ]}
          >
            <Plus size={15} color={colors.onPrimary} strokeWidth={2.8} />
            <Text style={[styles.addDishPillText, { color: colors.onPrimary }]}>New dish</Text>
          </Pressable>
        </View>

        {/* Action Navigation Bar: My Weekly Review + Admin Tools + Cook/Shop */}
        <View style={styles.navActionsRow}>
          <Pressable
            onPress={() => {
              haptics.selection();
              planner.navigateTo('weekly-review');
            }}
            accessibilityRole="button"
            accessibilityLabel="Open My Weekly Review"
            style={({ pressed }) => [
              styles.navChip,
              { backgroundColor: colors.secondarySoft, borderColor: colors.secondary },
              pressed && styles.pressed,
            ]}
          >
            <ClipboardCheck size={14} color={colors.text} />
            <Text style={[styles.navChipText, { color: colors.text }]}>
              My Review ({planner.myPlannedSlotCount})
            </Text>
          </Pressable>

          {planner.isAdmin ? (
            <>
              <Pressable
                onPress={() => {
                  haptics.selection();
                  planner.navigateTo('manage-slots');
                }}
                accessibilityRole="button"
                accessibilityLabel="Admin Manage Slots"
                style={({ pressed }) => [
                  styles.navChip,
                  { backgroundColor: colors.inputBackground, borderColor: colors.border },
                  pressed && styles.pressed,
                ]}
              >
                <Lock size={13} color={colors.text} />
                <Text style={[styles.navChipText, { color: colors.text }]}>Manage Slots</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  haptics.selection();
                  planner.navigateTo('finalize-menu');
                }}
                accessibilityRole="button"
                accessibilityLabel="Admin Finalize Weekly Menu"
                style={({ pressed }) => [
                  styles.navChip,
                  { backgroundColor: colors.primarySoft, borderColor: colors.primary },
                  pressed && styles.pressed,
                ]}
              >
                <Wand2 size={13} color={colors.text} />
                <Text style={[styles.navChipText, { color: colors.text }]}>Finalize Menu</Text>
              </Pressable>
            </>
          ) : null}

          <Pressable
            onPress={() => {
              haptics.selection();
              planner.navigateTo('cook-shop');
            }}
            accessibilityRole="button"
            accessibilityLabel="Open Cook and Shopping List"
            style={({ pressed }) => [
              styles.navChip,
              { backgroundColor: colors.inputBackground, borderColor: colors.border },
              pressed && styles.pressed,
            ]}
          >
            <UtensilsCrossed size={13} color={colors.text} />
            <Text style={[styles.navChipText, { color: colors.text }]}>Cook & Shop</Text>
          </Pressable>
        </View>
      </View>

      {/* Search Bar */}
      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.inputBackground, borderColor: colors.border },
        ]}
      >
        <Search size={16} color={colors.textMuted} />
        <TextInput
          value={planner.searchQuery}
          onChangeText={planner.setSearchQuery}
          placeholder="Search dishes or add a new one…"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          accessibilityLabel="Search dishes"
          style={[styles.searchInput, { color: colors.text }]}
        />
        {planner.searchQuery.length > 0 ? (
          <Pressable
            onPress={() => planner.setSearchQuery('')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <X size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* 3 Unified Catalog Filters: Liked, Recently Added, Suggested */}
      <View style={styles.filterRow} accessibilityRole="tablist">
        {FILTERS.map(({ key, label, Icon }) => {
          const selected = planner.catalogFilter === key;
          return (
            <Pressable
              key={key}
              onPress={() => {
                haptics.selection();
                planner.setCatalogFilter(key);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selected ? colors.primary : colors.card,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <Icon
                size={13}
                color={selected ? colors.onPrimary : colors.textMuted}
                strokeWidth={2.4}
              />
              <Text
                style={[
                  styles.filterChipText,
                  { color: selected ? colors.onPrimary : colors.text },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {planner.catalogError ? (
        <Text style={[styles.errorText, { color: colors.error }]}>{planner.catalogError}</Text>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <DishGrid
        dishes={planner.dishes}
        members={planner.members}
        isLoading={planner.isCatalogLoading}
        isRefreshing={planner.isCatalogLoading && planner.dishes.length > 0}
        onRefresh={() => void planner.refreshAll()}
        onSelectDish={handleSelectDish}
        assignedCountByDishKey={planner.assignedCountByDishKey}
        ListHeaderComponent={renderHeader()}
        ListFooterComponent={
          <Pressable
            onPress={() => {
              haptics.selection();
              setIsCreateModalOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Add new dish to catalog"
            style={({ pressed }) => [
              styles.bottomAddCard,
              { backgroundColor: colors.card, borderColor: colors.primary },
              pressed && styles.pressed,
            ]}
          >
            <Plus size={18} color={colors.text} strokeWidth={2.6} />
            <Text style={[styles.bottomAddText, { color: colors.text }]}>+ Add new dish</Text>
          </Pressable>
        }
      />

      <CreateRecipeModal
        visible={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateRecipe}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerContainer: {
    gap: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  heroBanner: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroTitleCol: {
    flex: 1,
    gap: 4,
  },
  heroHeadline: {
    fontSize: 20,
    fontWeight: '800',
  },
  weekSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weekSubhead: {
    fontSize: 13,
    fontWeight: '700',
  },
  addDishPill: {
    minHeight: 42,
    borderRadius: 999,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  addDishPillText: {
    fontSize: 13,
    fontWeight: '800',
  },
  navActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  navChip: {
    minHeight: 38,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  navChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  searchBar: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 8,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  bottomAddCard: {
    marginTop: 8,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bottomAddText: {
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.84,
  },
});
