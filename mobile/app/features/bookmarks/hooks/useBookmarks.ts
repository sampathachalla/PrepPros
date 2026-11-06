import { useMemo, useState, useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import { useBookmarkStore } from '../store/bookmarkStore';
import { useCalendarStore } from '../../calendar/store/calendarStore';
import type {
  Bookmark,
  BookmarkCategory,
  BookmarkSortOption,
  BookmarkSource,
  ImportBookmarkInput,
} from '../types/bookmarks';
import type { MealCategory } from '../../calendar/types/calendar';
import { validateImportBookmarkInput } from '../validators/bookmarkValidators';
import { BookmarkServiceError } from '../services/bookmarkService';

const errorMessage = (error: unknown) =>
  error instanceof BookmarkServiceError ? error.message : 'Something went wrong. Please try again.';

export function useBookmarks() {
  const bookmarks = useBookmarkStore((state) => state.bookmarks);
  const isLoading = useBookmarkStore((state) => state.isLoading);
  const loadError = useBookmarkStore((state) => state.loadError);
  const loadBookmarks = useBookmarkStore((state) => state.loadBookmarks);
  const importBookmarkToStore = useBookmarkStore((state) => state.importBookmark);
  const removeBookmarkFromStore = useBookmarkStore((state) => state.removeBookmark);
  const retryImportInStore = useBookmarkStore((state) => state.retryImport);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<BookmarkSource>('all');
  const [selectedCategory, setSelectedCategory] = useState<BookmarkCategory>('all');
  const [sortBy, setSortBy] = useState<BookmarkSortOption>('recent');

  // Modals
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [bookmarkToSchedule, setBookmarkToSchedule] = useState<Bookmark | null>(null);
  const [isCalendarModalVisible, setIsCalendarModalVisible] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedSource !== 'all') count += 1;
    if (selectedCategory !== 'all') count += 1;
    if (sortBy !== 'recent') count += 1;
    return count;
  }, [selectedSource, selectedCategory, sortBy]);

  const resetFilters = useCallback(() => {
    setSelectedSource('all');
    setSelectedCategory('all');
    setSortBy('recent');
  }, []);

  // Compute counts by source
  const countsBySource = useMemo(() => {
    return {
      all: bookmarks.length,
      instagram: bookmarks.filter((b) => b.source === 'instagram').length,
      youtube: bookmarks.filter((b) => b.source === 'youtube').length,
      app: bookmarks.filter((b) => b.source === 'app').length,
    };
  }, [bookmarks]);

  // Filter and sort bookmarks
  const filteredBookmarks = useMemo(() => {
    let result = [...bookmarks];

    // Source filter
    if (selectedSource !== 'all') {
      result = result.filter((b) => b.source === selectedSource);
    }

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter((b) => b.category === selectedCategory);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((b) => {
        const titleMatch = b.title.toLowerCase().includes(q);
        const authorMatch = b.author.toLowerCase().includes(q);
        const notesMatch = b.notes?.toLowerCase().includes(q) ?? false;
        const ingredientMatch = b.ingredients?.some((ing) => ing.toLowerCase().includes(q)) ?? false;
        const captionMatch = b.social?.caption?.toLowerCase().includes(q) ?? false;
        const hashtagMatch = b.social?.hashtags.some((tag) => tag.toLowerCase().includes(q)) ?? false;
        return titleMatch || authorMatch || notesMatch || ingredientMatch || captionMatch || hashtagMatch;
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'title_asc') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'time') {
        const timeA = (a.prepTimeMinutes ?? 0) + (a.cookTimeMinutes ?? 0);
        const timeB = (b.prepTimeMinutes ?? 0) + (b.cookTimeMinutes ?? 0);
        return timeA - timeB;
      }
      return 0;
    });

    return result;
  }, [bookmarks, selectedSource, selectedCategory, searchQuery, sortBy]);

  // Modal Triggers
  const openImportModal = useCallback(() => setIsImportModalVisible(true), []);
  const closeImportModal = useCallback(() => setIsImportModalVisible(false), []);

  const openDetailModal = useCallback((bookmark: Bookmark) => {
    setSelectedBookmark(bookmark);
    setIsDetailModalVisible(true);
  }, []);

  const closeDetailModal = useCallback(() => {
    setIsDetailModalVisible(false);
    setSelectedBookmark(null);
  }, []);

  const openCalendarModal = useCallback((bookmark: Bookmark) => {
    setBookmarkToSchedule(bookmark);
    setIsCalendarModalVisible(true);
  }, []);

  const closeCalendarModal = useCallback(() => {
    setIsCalendarModalVisible(false);
    setBookmarkToSchedule(null);
  }, []);

  const openFilterModal = useCallback(() => setIsFilterModalVisible(true), []);
  const closeFilterModal = useCallback(() => setIsFilterModalVisible(false), []);

  // Handlers
  const handleImportBookmark = useCallback(
    async (input: ImportBookmarkInput): Promise<{ success: boolean; error?: string }> => {
      const validation = validateImportBookmarkInput({ url: input.url });

      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      try {
        await importBookmarkToStore(input);
      } catch (error) {
        return { success: false, error: errorMessage(error) };
      }
      closeImportModal();
      return { success: true };
    },
    [importBookmarkToStore, closeImportModal],
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadBookmarks();
    setIsRefreshing(false);
  }, [loadBookmarks]);

  const handleRetryImport = useCallback(
    async (id: string) => {
      try {
        await retryImportInStore(id);
      } catch (error) {
        Alert.alert('Could not retry', errorMessage(error));
      }
    },
    [retryImportInStore],
  );

  const handleRemoveBookmark = useCallback(
    (id: string, title?: string) => {
      Alert.alert(
        'Remove Bookmark',
        `Are you sure you want to remove "${title || 'this recipe'}" from your bookmarks?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              if (selectedBookmark?.id === id) {
                closeDetailModal();
              }
              try {
                await removeBookmarkFromStore(id);
              } catch (error) {
                Alert.alert('Could not remove bookmark', errorMessage(error));
              }
            },
          },
        ],
      );
    },
    [removeBookmarkFromStore, selectedBookmark, closeDetailModal],
  );

  const handleOpenUrl = useCallback(async (url: string) => {
    if (!url) {
      Alert.alert('Notice', 'No external link attached to this recipe.');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open the link on this device.');
      }
    } catch {
      Alert.alert('Error', 'Could not open video URL.');
    }
  }, []);

  const handleScheduleToCalendar = useCallback(
    async (date: string, category: MealCategory, notes?: string): Promise<{ success: boolean }> => {
      if (!bookmarkToSchedule) return { success: false };
      try {
        await useCalendarStore.getState().addDish({ date, category, bookmarkId: bookmarkToSchedule.id, notes });
        closeCalendarModal();
        return { success: true };
      } catch (error) {
        Alert.alert('Could not add to the calendar', errorMessage(error));
        return { success: false };
      }
    },
    [bookmarkToSchedule, closeCalendarModal],
  );

  return {
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
  };
}
