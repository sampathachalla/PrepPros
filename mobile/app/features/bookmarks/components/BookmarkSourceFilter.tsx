import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Bookmark as BookmarkIcon, PlaySquare, Layers } from 'lucide-react-native';
import { InstagramIcon } from './InstagramIcon';
import { Brand, AppTheme, AppThemeDark } from '@/constants/Colors';
import { useThemeContext } from '@/context/ThemeContext';
import { SOURCE_FILTERS } from '../constants/bookmarks';
import type { BookmarkSource } from '../types/bookmarks';

interface BookmarkSourceFilterProps {
  selectedSource: BookmarkSource;
  onSelectSource: (source: BookmarkSource) => void;
  counts: { all: number; instagram: number; youtube: number; app: number };
}

export function BookmarkSourceFilter({
  selectedSource,
  onSelectSource,
  counts,
}: BookmarkSourceFilterProps) {
  const { theme } = useThemeContext();
  const isDark = theme === 'dark';
  const palette = isDark ? AppThemeDark : AppTheme;

  const renderIcon = (source: BookmarkSource, isSelected: boolean) => {
    const iconColor = isSelected ? Brand.black : isDark ? palette.text : palette.textMuted;
    const size = 15;

    switch (source) {
      case 'instagram':
        return <InstagramIcon size={size} color={isSelected ? Brand.black : '#E1306C'} />;
      case 'youtube':
        return <PlaySquare size={size} color={isSelected ? Brand.black : '#FF0000'} />;
      case 'app':
        return <BookmarkIcon size={size} color={isSelected ? Brand.black : Brand.babyPink} />;
      default:
        return <Layers size={size} color={iconColor} />;
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {SOURCE_FILTERS.map((item) => {
        const isSelected = selectedSource === item.key;
        const count = counts[item.key] ?? 0;

        return (
          <TouchableOpacity
            key={item.key}
            onPress={() => onSelectSource(item.key)}
            activeOpacity={0.7}
            style={[
              styles.pill,
              {
                backgroundColor: isSelected
                  ? Brand.babyPink
                  : isDark
                    ? palette.surface
                    : palette.surface,
                borderColor: isSelected
                  ? Brand.babyPink
                  : isDark
                    ? palette.border
                    : palette.border,
              },
            ]}
          >
            <View style={styles.iconWrapper}>{renderIcon(item.key, isSelected)}</View>
            <Text
              style={[
                styles.label,
                {
                  color: isSelected ? Brand.black : palette.text,
                  fontWeight: isSelected ? '700' : '500',
                },
              ]}
            >
              {item.label}
            </Text>
            <View
              style={[
                styles.countBadge,
                {
                  backgroundColor: isSelected
                    ? 'rgba(0,0,0,0.12)'
                    : isDark
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(0,0,0,0.06)',
                },
              ]}
            >
              <Text
                style={[
                  styles.countText,
                  {
                    color: isSelected ? Brand.black : palette.textMuted,
                  },
                ]}
              >
                {count}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  iconWrapper: {
    marginRight: 6,
  },
  label: {
    fontSize: 13,
  },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
