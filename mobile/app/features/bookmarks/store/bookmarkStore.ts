import { create } from 'zustand';
import { BookmarkServiceError, bookmarkService } from '../services/bookmarkService';
import type { Bookmark, ImportBookmarkInput } from '../types/bookmarks';

interface BookmarkState {
  bookmarks: Bookmark[];
  /** True until the first load finishes. */
  isLoading: boolean;
  loadError: string | null;

  // Actions
  loadBookmarks: () => Promise<void>;
  importBookmark: (input: ImportBookmarkInput) => Promise<Bookmark>;
  retryImport: (id: string) => Promise<void>;
  removeBookmark: (id: string) => Promise<void>;
  getBookmarkById: (id: string) => Bookmark | undefined;
}

/** Puts a bookmark at the top of the list, or updates it where it is. */
function upsert(bookmarks: Bookmark[], bookmark: Bookmark): Bookmark[] {
  return bookmarks.some((b) => b.id === bookmark.id)
    ? bookmarks.map((b) => (b.id === bookmark.id ? bookmark : b))
    : [bookmark, ...bookmarks];
}

/** Only the newest load may apply, so a slow response can't overwrite a newer one. */
let latestLoad = 0;
/** A load that started before a delete must not bring the bookmark back. */
const removing = new Set<string>();

export const useBookmarkStore = create<BookmarkState>()((set, get) => ({
  bookmarks: [],
  isLoading: true,
  loadError: null,

  loadBookmarks: async () => {
    const load = ++latestLoad;
    try {
      const bookmarks = await bookmarkService.list();
      if (load !== latestLoad) return;
      set({ bookmarks: bookmarks.filter((b) => !removing.has(b.id)), isLoading: false, loadError: null });
    } catch (error) {
      if (load !== latestLoad) return;
      const message = error instanceof BookmarkServiceError ? error.message : 'Could not load your bookmarks.';
      set({ isLoading: false, loadError: message });
    }
  },

  importBookmark: async (input) => {
    const bookmark = await bookmarkService.importLink(input);
    set((state) => ({ bookmarks: upsert(state.bookmarks, bookmark) }));
    return bookmark;
  },

  retryImport: async (id) => {
    const bookmark = await bookmarkService.retryImport(id);
    set((state) => ({ bookmarks: upsert(state.bookmarks, bookmark) }));
  },

  removeBookmark: async (id) => {
    const previous = get().bookmarks;
    removing.add(id);
    set({ bookmarks: previous.filter((b) => b.id !== id) });
    try {
      await bookmarkService.remove(id);
    } catch (error) {
      const removed = previous.find((b) => b.id === id);
      if (removed) set((state) => ({ bookmarks: [removed, ...state.bookmarks] }));
      throw error;
    } finally {
      removing.delete(id);
    }
  },

  getBookmarkById: (id) => get().bookmarks.find((b) => b.id === id),
}));
