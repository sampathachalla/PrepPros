import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Search,
  X,
  Plus,
  SlidersHorizontal,
  Bookmark as BookmarkIcon,
  RotateCcw,
} from 'lucide-react-native';
import { Brand, AppTheme, AppThemeDark } from '@/constants/Colors';
import { useThemeContext } from '@/context/ThemeContext';
import { useBookmarks } from '../hooks/useBookmarks';
import { BookmarkCard } from './BookmarkCard';
import { ImportBookmarkModal } from './ImportBookmarkModal';
import { BookmarkDetailModal } from './BookmarkDetailModal';
import { AddToCalendarBookmarkModal } from './AddToCalendarBookmarkModal';
import { BookmarkFiltersModal } from './BookmarkFiltersModal';
import { CATEGORY_FILTERS, SORT_OPTIONS, SOURCE_FILTERS } from '../constants/bookmarks';
import type { Bookmark } from '../types/bookmarks';

/** The Saved tab of the Bookmarks page: links people imported, and recipes they liked. */
export function SavedBookmarksView() {
  const { theme } = useThemeContext();
  const isDark = theme === 'dark';
  const palette = isDark ? AppThemeDark : AppTheme;

  const {
    bookmarks,
    isLoading,
    loadError,
    isRefreshing,
    handleRefresh,
    filteredBookmarks,
    countsBySource,
    searchQuery,
    setSearchQuery,
    selectedSource,
    setSelectedSource,
    selectedCategory,
    setSelectedCategory,
    sortBy,
    setSortBy,
    // Modals
    isImportModalVisible,
    openImportModal,
    closeImportModal,
    selectedBookmark,
    isDetailModalVisible,
    openDetailModal,
    closeDetailModal,
    bookmarkToSchedule,
    isCalendarModalVisible,
    openCalendarModal,
    closeCalendarModal,
    isFilterModalVisible,
    openFilterModal,
    closeFilterModal,
    activeFiltersCount,
    resetFilters,
    // Actions
    handleImportBookmark,
    handleRetryImport,
    handleRemoveBookmark,
    handleOpenUrl,
    handleScheduleToCalendar,
  } = useBookmarks();

  const sourceLabel = SOURCE_FILTERS.find((s) => s.key === selectedSource)?.label ?? 'Source';
  const categoryLabel = CATEGORY_FILTERS.find((c) => c.key === selectedCategory)?.label ?? 'Category';
  const sortLabel = SORT_OPTIONS.find((s) => s.key === sortBy)?.label ?? 'Sort';

  const renderItem = ({ item }: { item: Bookmark }) => (
    <BookmarkCard
      bookmark={item}
      onPress={openDetailModal}
      onSchedule={openCalendarModal}
      onRemove={handleRemoveBookmark}
      onRetry={handleRetryImport}
    />
  );

  const renderLoadError = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyTitle, { color: palette.text }]}>Couldn’t load bookmarks</Text>
      <Text style={[styles.emptySubtitle, { color: palette.textMuted }]}>{loadError}</Text>
      <TouchableOpacity
        onPress={handleRefresh}
        style={[styles.emptyButton, { backgroundColor: Brand.babyBlue }]}
      >
        <Text style={styles.emptyButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color={Brand.babyPink} accessibilityLabel="Loading bookmarks" />
        </View>
      );
    }
    if (loadError && bookmarks.length === 0) return renderLoadError();
    return renderNoBookmarks();
  };

  const renderNoBookmarks = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#262626' : '#F5F5F5' }]}>
        <BookmarkIcon size={32} color={Brand.babyPink} />
      </View>
      <Text style={[styles.emptyTitle, { color: palette.text }]}>No Bookmarks Found</Text>
      <Text style={[styles.emptySubtitle, { color: palette.textMuted }]}>
        {searchQuery || activeFiltersCount > 0
          ? 'Try adjusting your search query or reset your filters.'
          : 'Import your favorite recipes from Instagram Reels or YouTube to plan your week.'}
      </Text>

      {searchQuery || activeFiltersCount > 0 ? (
        <TouchableOpacity
          onPress={() => {
            setSearchQuery('');
            resetFilters();
          }}
          style={[styles.emptyButton, { backgroundColor: Brand.babyBlue }]}
        >
          <Text style={styles.emptyButtonText}>Reset Filters & Search</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={openImportModal}
          style={[styles.emptyButton, { backgroundColor: Brand.babyPink }]}
        >
          <Text style={styles.emptyButtonText}>+ Import First Recipe</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      {/* Search & Filter Trigger Row */}
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: isDark ? palette.surface : palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <Search size={16} color={palette.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: palette.text }]}
            placeholder="Search saved recipes, chefs, ingredients..."
            placeholderTextColor={palette.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color={palette.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Button (Opens the Filters Component Modal) */}
        <TouchableOpacity
          onPress={openFilterModal}
          activeOpacity={0.7}
          style={[
            styles.filterButton,
            {
              backgroundColor: isDark ? palette.surface : palette.surface,
              borderColor: activeFiltersCount > 0 ? Brand.babyPink : palette.border,
            },
          ]}
          accessibilityLabel="Open filters and sorting options"
        >
          <SlidersHorizontal
            size={15}
            color={activeFiltersCount > 0 ? Brand.babyPink : palette.text}
          />
          <Text
            style={[
              styles.filterButtonText,
              {
                color: palette.text,
                fontWeight: activeFiltersCount > 0 ? '700' : '600',
              },
            ]}
          >
            Filters
          </Text>

          {activeFiltersCount > 0 && (
            <View style={[styles.filterCountBadge, { backgroundColor: Brand.babyPink }]}>
              <Text style={styles.filterCountText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active Filter Chips Bar (Shown only when filters are active) */}
      {activeFiltersCount > 0 && (
        <View style={styles.activeFiltersWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activePillsContainer}>
            {selectedSource !== 'all' && (
              <TouchableOpacity
                onPress={() => setSelectedSource('all')}
                style={[styles.activePill, { backgroundColor: isDark ? '#262626' : '#F0F0F0' }]}
              >
                <Text style={[styles.activePillText, { color: palette.text }]}>{sourceLabel}</Text>
                <X size={12} color={palette.textMuted} />
              </TouchableOpacity>
            )}

            {selectedCategory !== 'all' && (
              <TouchableOpacity
                onPress={() => setSelectedCategory('all')}
                style={[styles.activePill, { backgroundColor: isDark ? '#262626' : '#F0F0F0' }]}
              >
                <Text style={[styles.activePillText, { color: palette.text }]}>{categoryLabel}</Text>
                <X size={12} color={palette.textMuted} />
              </TouchableOpacity>
            )}

            {sortBy !== 'recent' && (
              <TouchableOpacity
                onPress={() => setSortBy('recent')}
                style={[styles.activePill, { backgroundColor: isDark ? '#262626' : '#F0F0F0' }]}
              >
                <Text style={[styles.activePillText, { color: palette.text }]}>{sortLabel}</Text>
                <X size={12} color={palette.textMuted} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={resetFilters}
              style={[styles.clearAllPill, { borderColor: palette.border }]}
            >
              <RotateCcw size={11} color={Brand.babyPink} />
              <Text style={[styles.clearAllText, { color: Brand.babyPink }]}>Clear</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Recipe List */}
      <FlatList
        data={filteredBookmarks}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={Brand.babyPink} />
        }
      />

      {/* Floating Import Link Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={openImportModal}
        style={[styles.fab, { backgroundColor: Brand.babyPink }]}
        accessibilityLabel="Import new Instagram or YouTube recipe"
      >
        <Plus size={24} color={Brand.black} strokeWidth={2.5} />
        <Text style={styles.fabText}>Import Link</Text>
      </TouchableOpacity>

      {/* Modals */}
      <BookmarkFiltersModal
        visible={isFilterModalVisible}
        onClose={closeFilterModal}
        selectedSource={selectedSource}
        onSelectSource={setSelectedSource}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        sortBy={sortBy}
        onSelectSort={setSortBy}
        countsBySource={countsBySource}
        resultsCount={filteredBookmarks.length}
        activeFiltersCount={activeFiltersCount}
        onResetFilters={resetFilters}
      />

      <ImportBookmarkModal
        visible={isImportModalVisible}
        onClose={closeImportModal}
        onImport={handleImportBookmark}
      />

      <BookmarkDetailModal
        bookmark={selectedBookmark}
        visible={isDetailModalVisible}
        onClose={closeDetailModal}
        onWatch={handleOpenUrl}
        onSchedule={openCalendarModal}
        onRemove={handleRemoveBookmark}
      />

      <AddToCalendarBookmarkModal
        bookmark={bookmarkToSchedule}
        visible={isCalendarModalVisible}
        onClose={closeCalendarModal}
        onSchedule={handleScheduleToCalendar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
  },
  filterButtonText: {
    fontSize: 13,
  },
  filterCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  filterCountText: {
    color: Brand.black,
    fontSize: 10,
    fontWeight: '800',
  },
  activeFiltersWrapper: {
    marginBottom: 8,
  },
  activePillsContainer: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  activePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clearAllPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  clearAllText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 96,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  emptyButtonText: {
    color: Brand.black,
    fontSize: 13,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: {
    color: Brand.black,
    fontSize: 14,
    fontWeight: '800',
  },
});
