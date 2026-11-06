import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { useBookmarkStore } from '../store/bookmarkStore';
import { BookmarkServiceError, bookmarkService } from '../services/bookmarkService';
import { validateImportBookmarkInput } from '../validators/bookmarkValidators';
import type { Bookmark } from '../types/bookmarks';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('../services/bookmarkService', () => ({
  ...jest.requireActual('../services/bookmarkService'),
  bookmarkService: { list: jest.fn(), importLink: jest.fn(), retryImport: jest.fn(), remove: jest.fn() },
}));

const service = jest.mocked(bookmarkService);

const bookmark = (id: string, partial: Partial<Bookmark> = {}): Bookmark => ({
  id,
  title: `Recipe ${id}`,
  source: 'instagram',
  url: `https://www.instagram.com/reel/${id}/`,
  thumbnailUrl: 'https://example.com/a.jpg',
  author: '@chef',
  category: 'all',
  createdAt: '2026-11-01T12:00:00.000Z',
  importStatus: 'ready',
  ...partial,
});

const store = () => useBookmarkStore.getState();

describe('Bookmarks store', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    useBookmarkStore.setState({ bookmarks: [], isLoading: true, loadError: null });
  });

  it('starts empty, with no sample data', () => {
    expect(store().bookmarks).toEqual([]);
  });

  it('loads bookmarks from the API', async () => {
    service.list.mockResolvedValue([bookmark('a')]);
    await store().loadBookmarks();
    expect(store()).toMatchObject({ bookmarks: [{ id: 'a' }], isLoading: false, loadError: null });
  });

  it('keeps what it has and reports the problem when a load fails', async () => {
    useBookmarkStore.setState({ bookmarks: [bookmark('a')] });
    service.list.mockRejectedValue(new BookmarkServiceError('Can’t reach PrepPros.'));
    await store().loadBookmarks();
    expect(store()).toMatchObject({ bookmarks: [{ id: 'a' }], isLoading: false, loadError: 'Can’t reach PrepPros.' });
  });

  it('ignores a slow load once a newer one has answered', async () => {
    let finishSlowLoad!: (bookmarks: Bookmark[]) => void;
    service.list.mockReturnValueOnce(new Promise((resolve) => (finishSlowLoad = resolve)));
    service.list.mockResolvedValueOnce([bookmark('new')]);

    const slow = store().loadBookmarks();
    await store().loadBookmarks();
    finishSlowLoad([bookmark('old')]);
    await slow;

    expect(store().bookmarks.map((b) => b.id)).toEqual(['new']);
  });

  it('adds an imported link to the top while it is processing', async () => {
    useBookmarkStore.setState({ bookmarks: [bookmark('a')] });
    service.importLink.mockResolvedValue(bookmark('b', { importStatus: 'processing' }));

    await store().importBookmark({ url: 'https://www.instagram.com/reel/b/', source: 'instagram' });

    expect(store().bookmarks.map((b) => b.id)).toEqual(['b', 'a']);
  });

  it('does not list a link twice when it was already saved', async () => {
    useBookmarkStore.setState({ bookmarks: [bookmark('a'), bookmark('b')] });
    service.importLink.mockResolvedValue(bookmark('b', { title: 'Updated' }));

    await store().importBookmark({ url: 'https://www.instagram.com/reel/b/', source: 'instagram' });

    expect(store().bookmarks.map((b) => b.title)).toEqual(['Recipe a', 'Updated']);
  });

  it('passes on import errors without adding anything', async () => {
    service.importLink.mockRejectedValue(new BookmarkServiceError('Paste a link to an Instagram post or reel'));
    await expect(
      store().importBookmark({ url: 'https://www.instagram.com/x/', source: 'instagram' }),
    ).rejects.toThrow('Paste a link');
    expect(store().bookmarks).toEqual([]);
  });

  it('marks a failed import as processing again on retry', async () => {
    useBookmarkStore.setState({ bookmarks: [bookmark('a', { importStatus: 'failed' })] });
    service.retryImport.mockResolvedValue(bookmark('a', { importStatus: 'processing' }));
    await store().retryImport('a');
    expect(store().bookmarks[0].importStatus).toBe('processing');
  });

  it('removes a bookmark at once', async () => {
    useBookmarkStore.setState({ bookmarks: [bookmark('a'), bookmark('b')] });
    service.remove.mockResolvedValue();
    await store().removeBookmark('a');
    expect(service.remove).toHaveBeenCalledWith('a');
    expect(store().bookmarks.map((b) => b.id)).toEqual(['b']);
  });

  it('puts a bookmark back if the delete fails', async () => {
    useBookmarkStore.setState({ bookmarks: [bookmark('a')] });
    service.remove.mockRejectedValue(new BookmarkServiceError('Can’t reach PrepPros.'));
    await expect(store().removeBookmark('a')).rejects.toThrow();
    expect(store().bookmarks.map((b) => b.id)).toEqual(['a']);
  });

  it('does not bring back a bookmark deleted while a load was under way', async () => {
    useBookmarkStore.setState({ bookmarks: [bookmark('a')] });
    let finishDelete!: () => void;
    service.remove.mockReturnValue(new Promise((resolve) => (finishDelete = resolve)));
    service.list.mockResolvedValue([bookmark('a')]);

    const removal = store().removeBookmark('a');
    await store().loadBookmarks();
    finishDelete();
    await removal;

    expect(store().bookmarks).toEqual([]);
  });
});

describe('validateImportBookmarkInput', () => {
  it('accepts Instagram and YouTube links', () => {
    expect(validateImportBookmarkInput({ url: 'https://www.instagram.com/reel/C8_abc123/' }).valid).toBe(true);
    expect(validateImportBookmarkInput({ url: 'https://youtu.be/dQw4w9WgXcQ' }).valid).toBe(true);
  });

  it('rejects empty, malformed and other sites’ links', () => {
    for (const url of ['', 'not a url', 'https://twitter.com/foodvideos/status/123']) {
      expect(validateImportBookmarkInput({ url }).valid).toBe(false);
    }
  });
});
