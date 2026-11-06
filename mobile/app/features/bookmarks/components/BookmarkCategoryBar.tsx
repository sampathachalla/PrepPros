import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Brand, AppTheme, AppThemeDark } from '@/constants/Colors';
import { useThemeContext } from '@/context/ThemeContext';
import { CATEGORY_FILTERS } from '../constants/bookmarks';
import type { BookmarkCategory } from '../types/bookmarks';

interface BookmarkCategoryBarProps {
  selectedCategory: BookmarkCategory;
  onSelectCategory: (cat: BookmarkCategory) => void;
}

export function BookmarkCategoryBar({
  selectedCategory,
  onSelectCategory,
}: BookmarkCategoryBarProps) {
  const { theme } = useThemeContext();
  const isDark = theme === 'dark';
  const palette = isDark ? AppThemeDark : AppTheme;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {CATEGORY_FILTERS.map((cat) => {
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
                  ? Brand.babyBlue
                  : isDark
                    ? palette.surface
                    : palette.surface,
                borderColor: isSelected
                  ? Brand.babyBlue
                  : isDark
                    ? palette.border
                    : palette.border,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: isSelected ? Brand.black : palette.text,
                  fontWeight: isSelected ? '700' : '500',
                },
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
});
