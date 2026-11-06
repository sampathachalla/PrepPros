import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useBookmarkStore } from '../store/bookmarkStore';
import { BOOKMARK_POLL_INTERVAL_MS } from '../constants/bookmarks';

/**
 * Keeps bookmarks current for the whole app (Calendar and Profile read them too): loads them, reloads
 * when the app returns to the foreground, and checks on imports still being read in the background.
 */
export function useBookmarkSync() {
  const loadBookmarks = useBookmarkStore((state) => state.loadBookmarks);
  const hasProcessing = useBookmarkStore((state) =>
    state.bookmarks.some((bookmark) => bookmark.importStatus === 'processing'),
  );

  useEffect(() => {
    void loadBookmarks();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') void loadBookmarks();
    });
    return () => subscription.remove();
  }, [loadBookmarks]);

  useEffect(() => {
    if (!hasProcessing) return;
    const timer = setInterval(() => void loadBookmarks(), BOOKMARK_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [hasProcessing, loadBookmarks]);
}
