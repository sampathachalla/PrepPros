import React, { useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Search, X, Plus } from 'lucide-react-native';
import { HeaderIconButton, useScreenHeader } from '@/app/shared';
import { AppTheme, AppThemeDark } from '@/constants/Colors';
import { useThemeContext } from '@/context/ThemeContext';
import { useRecipes } from '../hooks/useRecipes';
import { RecipeCard } from '../components/RecipeCard';
import { RecipeCategoryBar } from '../components/RecipeCategoryBar';
import { RecipeDetailModal } from '../components/RecipeDetailModal';
import { CreateRecipeModal } from '../components/CreateRecipeModal';
import { AddToCalendarModal } from '../components/AddToCalendarModal';
import type { Recipe } from '../types/recipes';

export default function RecipesScreen() {
  const { theme } = useThemeContext();
  const isDark = theme === 'dark';
  const palette = isDark ? AppThemeDark : AppTheme;

  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    filteredRecipes,
    isLoading,
    loadError,
    selectedRecipe,
    recipeToSchedule,
    isDetailVisible,
    isCreateVisible,
    isAddToCalendarVisible,
    openDetail,
    closeDetail,
    openCreate,
    closeCreate,
    openAddToCalendar,
    closeAddToCalendar,
    handleToggleBookmark,
    handleCreateRecipe,
    handleScheduleToCalendar,
  } = useRecipes();

  const createAction = useMemo(
    () => <HeaderIconButton label="New recipe" onPress={openCreate} icon={Plus} />,
    [openCreate],
  );
  useScreenHeader({ title: 'Recipes', rightAction: createAction });

  const renderItem = ({ item }: { item: Recipe }) => (
    <RecipeCard
      recipe={item}
      onPress={openDetail}
      onToggleBookmark={handleToggleBookmark}
    />
  );

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      {/* Search Input Bar */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Search size={18} color={palette.textMuted} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search recipes, ingredients..."
            placeholderTextColor={palette.textMuted}
            style={[styles.searchInput, { color: palette.text }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color={palette.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories Filter Bar */}
      <RecipeCategoryBar
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      <View style={styles.subHeader}>
        <Text style={[styles.countText, { color: palette.textMuted }]}>
          {filteredRecipes.length} {filteredRecipes.length === 1 ? 'recipe' : 'recipes'}
        </Text>
      </View>

      {/* Recipes List */}
      <FlatList
        data={filteredRecipes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: palette.text }]}>
              {isLoading ? 'Loading recipes…' : loadError ? 'Couldn’t load recipes' : 'No recipes found'}
            </Text>
            {isLoading ? null : (
              <Text style={[styles.emptySubtitle, { color: palette.textMuted }]}>
                {loadError ?? 'Try searching with another keyword or change your category filter.'}
              </Text>
            )}
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={[styles.clearBtn, { backgroundColor: palette.surface, borderColor: palette.border }]}
              >
                <Text style={[styles.clearBtnText, { color: palette.text }]}>
                  Clear search
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        recipe={selectedRecipe}
        visible={isDetailVisible}
        onClose={closeDetail}
        onToggleBookmark={handleToggleBookmark}
        onAddToCalendar={(rec) => {
          closeDetail();
          openAddToCalendar(rec);
        }}
      />

      {/* Custom Recipe Creator Modal */}
      <CreateRecipeModal
        visible={isCreateVisible}
        onClose={closeCreate}
        onCreate={handleCreateRecipe}
      />

      {/* Add To Calendar Dialog */}
      <AddToCalendarModal
        recipe={recipeToSchedule}
        visible={isAddToCalendarVisible}
        onClose={closeAddToCalendar}
        onSchedule={handleScheduleToCalendar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 4,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  clearBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
