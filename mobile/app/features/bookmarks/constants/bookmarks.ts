import type { BookmarkCategory, BookmarkSortOption, BookmarkSource } from '../types/bookmarks';

export const BOOKMARK_REQUEST_TIMEOUT_MS = 20_000;

/** How often imports still being read are checked on. */
export const BOOKMARK_POLL_INTERVAL_MS = 5_000;

export const SOURCE_FILTERS: { key: BookmarkSource; label: string }[] = [
  { key: 'all', label: 'All Sources' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'app', label: 'PrepPros Recipes' },
];

export const CATEGORY_FILTERS: { key: BookmarkCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch_dinner', label: 'Lunch & Dinner' },
  { key: 'snacks', label: 'Snacks' },
  { key: 'high_protein', label: 'High Protein' },
  { key: 'dessert', label: 'Dessert' },
];

export const SORT_OPTIONS: { key: BookmarkSortOption; label: string }[] = [
  { key: 'recent', label: 'Recently Added' },
  { key: 'title_asc', label: 'Name (A–Z)' },
  { key: 'time', label: 'Fastest Prep' },
];

export const PLATFORM_COLORS = {
  instagram: '#E1306C',
  youtube: '#FF0000',
  app: '#F5AFC4',
} as const;
