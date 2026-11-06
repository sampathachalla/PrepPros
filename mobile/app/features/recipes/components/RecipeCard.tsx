import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Clock, Bookmark, ChefHat, Utensils } from 'lucide-react-native';
import { Brand, AppTheme, AppThemeDark } from '@/constants/Colors';
import { useThemeContext } from '@/context/ThemeContext';
import type { Recipe } from '../types/recipes';

interface RecipeCardProps {
  recipe: Recipe;
  onPress: (recipe: Recipe) => void;
  onToggleBookmark: (recipeId: string) => void;
}

/**
 * Clean, compact simple list row for recipes (no images).
 * Displays category, prep time, difficulty, title, ingredients count, and bookmark toggle.
 */
export function RecipeCard({ recipe, onPress, onToggleBookmark }: RecipeCardProps) {
  const { theme } = useThemeContext();
  const isDark = theme === 'dark';
  const palette = isDark ? AppThemeDark : AppTheme;

  const formatCategory = (cat: string) => {
    switch (cat) {
      case 'high_protein':
        return 'High Protein';
      case 'quick_prep':
        return 'Quick Prep';
      case 'breakfast':
        return 'Breakfast';
      case 'lunch_dinner':
        return 'Lunch / Dinner';
      case 'vegetarian':
        return 'Vegetarian';
      case 'snacks':
        return 'Snack';
      default:
        return 'Meal Prep';
    }
  };

  const ingredientCount = recipe.ingredients?.length ?? 0;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(recipe)}
      style={[
        styles.rowItem,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
        },
      ]}
      accessibilityLabel={recipe.title}
      accessibilityRole="button"
    >
      {/* Left Icon Badge */}
      <View
        style={[
          styles.iconBox,
          {
            backgroundColor: isDark
              ? 'rgba(168, 221, 245, 0.15)'
              : 'rgba(168, 221, 245, 0.25)',
          },
        ]}
      >
        <ChefHat size={22} color={Brand.babyBlue} />
      </View>

      {/* Main Info */}
      <View style={styles.infoCol}>
        {/* Top meta row: Category + Time + Difficulty */}
        <View style={styles.metaRow}>
          <View
            style={[
              styles.categoryPill,
              { backgroundColor: isDark ? '#262626' : '#F0F0F0' },
            ]}
          >
            <Text style={[styles.categoryText, { color: palette.textMuted }]}>
              {formatCategory(recipe.category)}
            </Text>
          </View>

          <Text style={[styles.metaDot, { color: palette.textMuted }]}>•</Text>

          <View style={styles.timeWrapper}>
            <Clock size={11} color={palette.textMuted} />
            <Text style={[styles.timeText, { color: palette.textMuted }]}>
              {recipe.prepTimeMinutes}m prep
            </Text>
          </View>

          {recipe.difficulty && (
            <>
              <Text style={[styles.metaDot, { color: palette.textMuted }]}>•</Text>
              <Text
                style={[
                  styles.difficultyText,
                  { color: isDark ? Brand.babyBlue : '#006699' },
                ]}
              >
                {recipe.difficulty.charAt(0).toUpperCase() + recipe.difficulty.slice(1)}
              </Text>
            </>
          )}
        </View>

        {/* Recipe Title */}
        <Text style={[styles.title, { color: palette.text }]} numberOfLines={2}>
          {recipe.title}
        </Text>

        {/* Sub-detail: Ingredients count & Servings */}
        <View style={styles.subDetailRow}>
          {ingredientCount > 0 && (
            <View style={styles.detailPill}>
              <Utensils size={11} color={palette.textMuted} />
              <Text style={[styles.detailText, { color: palette.textMuted }]}>
                {ingredientCount} ingredients
              </Text>
            </View>
          )}

          <Text style={[styles.metaDot, { color: palette.textMuted }]}>•</Text>

          <Text style={[styles.detailText, { color: palette.textMuted }]}>
            {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}
          </Text>
        </View>
      </View>

      {/* Right: Bookmark Button */}
      <TouchableOpacity
        onPress={() => onToggleBookmark(recipe.id)}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={[
          styles.bookmarkButton,
          {
            backgroundColor: recipe.isBookmarked
              ? isDark
                ? 'rgba(245, 175, 196, 0.2)'
                : 'rgba(245, 175, 196, 0.3)'
              : isDark
                ? '#262626'
                : '#F5F5F5',
          },
        ]}
        accessibilityLabel={
          recipe.isBookmarked ? 'Remove bookmark' : 'Bookmark recipe'
        }
      >
        <Bookmark
          size={16}
          color={recipe.isBookmarked ? Brand.babyPink : palette.textMuted}
          fill={recipe.isBookmarked ? Brand.babyPink : 'transparent'}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    marginBottom: 4,
    gap: 5,
  },
  categoryPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
  },
  metaDot: {
    fontSize: 10,
    opacity: 0.6,
  },
  timeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '700',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: 4,
  },
  subDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 11,
    fontWeight: '500',
  },
  bookmarkButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
