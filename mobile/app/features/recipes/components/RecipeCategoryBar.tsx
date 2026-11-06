import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { RECIPE_CATEGORIES } from '../constants/recipes';
import type { RecipeCategory } from '../types/recipes';
import { Brand, AppTheme, AppThemeDark } from '@/constants/Colors';
import { useThemeContext } from '@/context/ThemeContext';

interface RecipeCategoryBarProps {
  selectedCategory: RecipeCategory;
  onSelectCategory: (category: RecipeCategory) => void;
}

export function RecipeCategoryBar({
  selectedCategory,
  onSelectCategory,
}: RecipeCategoryBarProps) {
  const { theme } = useThemeContext();
  const isDark = theme === 'dark';
  const palette = isDark ? AppThemeDark : AppTheme;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {RECIPE_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              onPress={() => onSelectCategory(cat.key)}
              activeOpacity={0.7}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected
                    ? Brand.babyPink
                    : palette.surface,
                  borderColor: isSelected
                    ? Brand.babyPink
                    : palette.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: isSelected
                      ? Brand.black
                      : palette.textMuted,
                    fontWeight: isSelected ? '700' : '600',
                  },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: {
    fontSize: 12,
    letterSpacing: 0.1,
  },
});
