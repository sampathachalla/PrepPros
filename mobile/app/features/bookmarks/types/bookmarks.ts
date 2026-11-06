export type BookmarkSource = 'all' | 'instagram' | 'youtube' | 'app';

export type BookmarkCategory =
  | 'all'
  | 'breakfast'
  | 'lunch_dinner'
  | 'snacks'
  | 'high_protein'
  | 'quick_prep'
  | 'vegetarian'
  | 'dessert';

export type BookmarkSortOption = 'recent' | 'title_asc' | 'time';

/** Links are read in the background; Instagram takes about a minute. */
export type BookmarkImportStatus = 'processing' | 'ready' | 'failed';

/** From the API while an import is processing. */
export interface BookmarkImportEstimate {
  /** How long recent imports from this platform took. */
  averageSeconds: number;
  /** How long this import has waited so far. */
  elapsedSeconds: number;
}

export interface BookmarkSocialDetails {
  contentType: 'reel' | 'post' | 'video' | 'short';
  caption?: string;
  hashtags: string[];
  photos: string[];
  videos: string[];
  videoUrl?: string;
  durationSeconds?: number;
  likesCount?: number;
  commentsCount?: number;
  viewsCount?: number;
  postedAt?: string;
}

export interface Bookmark {
  id: string;
  title: string;
  source: 'instagram' | 'youtube' | 'app';
  url: string;
  thumbnailUrl: string;
  author: string;
  category: BookmarkCategory;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  ingredients?: string[];
  notes?: string;
  createdAt: string;
  recipeId?: string;
  socialPostId?: string;
  social?: BookmarkSocialDetails;
  importStatus?: BookmarkImportStatus;
  /** Why reading the link failed, when `importStatus` is failed. */
  importError?: string;
  importEstimate?: BookmarkImportEstimate;
}

export interface ImportBookmarkInput {
  url: string;
  source: 'instagram' | 'youtube';
}
