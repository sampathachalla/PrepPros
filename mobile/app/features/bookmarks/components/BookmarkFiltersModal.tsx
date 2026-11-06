import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  X,
  SlidersHorizontal,
  RotateCcw,
  Layers,
  PlaySquare,
  Bookmark as BookmarkIcon,
  Check,
  ArrowDownAZ,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { Brand, AppTheme, AppThemeDark } from '@/constants/Colors';
import { useThemeContext } from '@/context/ThemeContext';
import {
  CATEGORY_FILTERS,
  SORT_OPTIONS,
  SOURCE_FILTERS,
} from '../constants/bookmarks';
import { InstagramIcon } from './InstagramIcon';
import type {
  BookmarkCategory,
  BookmarkSortOption,
  BookmarkSource,
} from '../types/bookmarks';

interface BookmarkFiltersModalProps {
  visible: boolean;
  onClose: () => void;
  selectedSource: BookmarkSource;
  onSelectSource: (source: BookmarkSource) => void;
  selectedCategory: BookmarkCategory;
  onSelectCategory: (cat: BookmarkCategory) => void;
  sortBy: BookmarkSortOption;
  onSelectSort: (sort: BookmarkSortOption) => void;
  countsBySource: { all: number; instagram: number; youtube: number; app: number };
  resultsCount: number;
  activeFiltersCount: number;
  onResetFilters: () => void;
}

export function BookmarkFiltersModal({
  visible,
  onClose,
  selectedSource,
  onSelectSource,
  selectedCategory,
  onSelectCategory,
  sortBy,
  onSelectSort,
  countsBySource,
  resultsCount,
  activeFiltersCount,
  onResetFilters,
}: BookmarkFiltersModalProps) {
  const { theme } = useThemeContext();
  const isDark = theme === 'dark';
  const palette = isDark ? AppThemeDark : AppTheme;

  const renderSourceIcon = (source: BookmarkSource, isSelected: boolean) => {
    const size = 16;
    switch (source) {
      case 'instagram':
        return <InstagramIcon size={size} color={isSelected ? Brand.black : '#E1306C'} />;
      case 'youtube':
        return <PlaySquare size={size} color={isSelected ? Brand.black : '#FF0000'} />;
      case 'app':
        return <BookmarkIcon size={size} color={isSelected ? Brand.black : Brand.babyPink} />;
      default:
        return <Layers size={size} color={isSelected ? Brand.black : palette.textMuted} />;
    }
  };

  const renderSortIcon = (key: BookmarkSortOption, isSelected: boolean) => {
    const color = isSelected ? Brand.black : palette.textMuted;
    switch (key) {
      case 'title_asc':
        return <ArrowDownAZ size={16} color={color} />;
      case 'time':
        return <Clock size={16} color={color} />;
      default:
        return <Sparkles size={16} color={color} />;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityLabel="Dismiss filters"
        />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? palette.surface : palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: Brand.babyPink }]} />
          </View>

          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: palette.border }]}>
            <View style={styles.headerTitleRow}>
              <SlidersHorizontal size={18} color={Brand.babyPink} />
              <Text style={[styles.headerTitle, { color: palette.text }]}>Filters & Sort</Text>
              {activeFiltersCount > 0 && (
                <View style={[styles.activeBadge, { backgroundColor: Brand.babyPink }]}>
                  <Text style={styles.activeBadgeText}>{activeFiltersCount}</Text>
                </View>
              )}
            </View>

            <View style={styles.headerActions}>
              {activeFiltersCount > 0 && (
                <TouchableOpacity
                  onPress={onResetFilters}
                  activeOpacity={0.7}
                  style={styles.resetButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <RotateCcw size={13} color={palette.textMuted} />
                  <Text style={[styles.resetText, { color: palette.textMuted }]}>Reset</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={onClose}
                style={[styles.closeButton, { backgroundColor: isDark ? '#262626' : '#F0F0F0' }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={18} color={palette.text} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Section 1: Source */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Recipe Source</Text>
              <View style={styles.chipsGrid}>
                {SOURCE_FILTERS.map((item) => {
                  const isSelected = selectedSource === item.key;
                  const count = countsBySource[item.key] ?? 0;

                  return (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => onSelectSource(item.key)}
                      activeOpacity={0.7}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected
                            ? Brand.babyPink
                            : isDark
                              ? '#1C1C1E'
                              : '#F7F7F7',
                          borderColor: isSelected ? Brand.babyPink : palette.border,
                        },
                      ]}
                    >
                      <View style={styles.chipIcon}>{renderSourceIcon(item.key, isSelected)}</View>
                      <Text
                        style={[
                          styles.chipLabel,
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
                          styles.countPill,
                          {
                            backgroundColor: isSelected
                              ? 'rgba(0,0,0,0.12)'
                              : isDark
                                ? '#2A2A2A'
                                : '#EAEAEA',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.countPillText,
                            { color: isSelected ? Brand.black : palette.textMuted },
                          ]}
                        >
                          {count}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Section 2: Meal Category */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Meal Category</Text>
              <View style={styles.chipsGrid}>
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
                              ? '#1C1C1E'
                              : '#F7F7F7',
                          borderColor: isSelected ? Brand.babyBlue : palette.border,
                        },
                      ]}
                    >
                      {isSelected && (
                        <Check size={14} color={Brand.black} strokeWidth={2.5} style={{ marginRight: 6 }} />
                      )}
                      <Text
                        style={[
                          styles.chipLabel,
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
              </View>
            </View>

            {/* Section 3: Sort Order */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Sort By</Text>
              <View style={styles.chipsGrid}>
                {SORT_OPTIONS.map((opt) => {
                  const isSelected = sortBy === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => onSelectSort(opt.key)}
                      activeOpacity={0.7}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected
                            ? Brand.babyPink
                            : isDark
                              ? '#1C1C1E'
                              : '#F7F7F7',
                          borderColor: isSelected ? Brand.babyPink : palette.border,
                        },
                      ]}
                    >
                      {isSelected ? (
                        <Check size={14} color={Brand.black} strokeWidth={2.5} style={{ marginRight: 6 }} />
                      ) : (
                        <View style={styles.chipIcon}>
                          {renderSortIcon(opt.key, isSelected)}
                        </View>
                      )}
                      <Text
                        style={[
                          styles.chipLabel,
                          {
                            color: isSelected ? Brand.black : palette.text,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Bottom CTA Button */}
          <View style={[styles.footer, { borderTopColor: palette.border }]}>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.85}
              style={[styles.applyButton, { backgroundColor: Brand.babyPink }]}
            >
              <Text style={styles.applyButtonText}>
                {resultsCount === 0
                  ? 'No matching recipes'
                  : `Show ${resultsCount} ${resultsCount === 1 ? 'Recipe' : 'Recipes'}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    maxHeight: '85%',
    paddingTop: 8,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  activeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeBadgeText: {
    color: Brand.black,
    fontSize: 11,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 18,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipIcon: {
    marginRight: 6,
  },
  chipLabel: {
    fontSize: 13,
  },
  countPill: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  countPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 18,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  applyButton: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    color: Brand.black,
    fontSize: 15,
    fontWeight: '800',
  },
});
