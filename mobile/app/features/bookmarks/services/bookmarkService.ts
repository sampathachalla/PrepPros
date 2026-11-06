import { ApiError, apiRequest } from '@/app/shared/services/apiClient';
import type { Bookmark, BookmarkCategory, ImportBookmarkInput } from '../types/bookmarks';

/** A bookmark as the API sends it; `category` is absent until one can be worked out. */
type ApiBookmark = Omit<Bookmark, 'category'> & { category?: Exclude<BookmarkCategory, 'all'> };

/** An error whose message can be shown to the user. */
export { ApiError as BookmarkServiceError };

const toBookmark = (bookmark: ApiBookmark): Bookmark => ({ ...bookmark, category: bookmark.category ?? 'all' });

/** Bookmarks Service layer: talks to api/src/modules/bookmarks. */
export const bookmarkService = {
  async list(): Promise<Bookmark[]> {
    return (await apiRequest<ApiBookmark[]>({ method: 'GET', url: '/bookmarks' })).map(toBookmark);
  },

  /** Saves the link; the API reads it in the background, so the result may still be processing. */
  async importLink(input: ImportBookmarkInput): Promise<Bookmark> {
    const data = { url: input.url, via: 'paste' };
    return toBookmark(await apiRequest<ApiBookmark>({ method: 'POST', url: '/bookmarks/import', data }));
  },

  async retryImport(id: string): Promise<Bookmark> {
    return toBookmark(await apiRequest<ApiBookmark>({ method: 'POST', url: `/bookmarks/${id}/retry` }));
  },

  async remove(id: string): Promise<void> {
    await apiRequest({ method: 'DELETE', url: `/bookmarks/${id}` });
  },
};
