import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import axios, { AxiosError, type AxiosResponse } from 'axios';
import { BookmarkServiceError, bookmarkService } from '../services/bookmarkService';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('axios', () => ({
  ...jest.requireActual('axios'),
  __esModule: true,
  default: { request: jest.fn(), post: jest.fn() },
}));

const http = jest.mocked(axios);

const apiError = (status: number, detail?: string) =>
  new AxiosError('failed', undefined, undefined, undefined, { status, data: { detail } } as AxiosResponse);

describe('bookmarkService', () => {
  beforeEach(async () => {
    // Only axios: resetting everything would also wipe the storage mock's behaviour
    http.request.mockReset();
    http.post.mockReset();
    await mockAsyncStorage.clear();
  });

  it('shows bookmarks without a category as uncategorised', async () => {
    http.request.mockResolvedValue({ data: [{ id: 'a', title: 'Reel' }, { id: 'b', category: 'snacks' }] });
    expect((await bookmarkService.list()).map((b) => b.category)).toEqual(['all', 'snacks']);
  });

  it('sends the signed-in user’s token', async () => {
    await mockAsyncStorage.setItem('userInfo', JSON.stringify({ accessToken: 'real-token' }));
    http.request.mockResolvedValue({ data: [] });

    await bookmarkService.list();

    expect(http.request.mock.calls[0][0].headers).toEqual({ Authorization: 'Bearer real-token' });
  });

  it('sends no token when nobody is signed in, so the API can use its temporary user', async () => {
    http.request.mockResolvedValue({ data: [] });
    await bookmarkService.list();
    expect(http.request.mock.calls[0][0].headers).toBeUndefined();
  });

  it('turns API errors into messages for the user', async () => {
    http.request.mockRejectedValueOnce(apiError(429, 'You’re importing links too quickly, please wait a moment.'));
    await expect(bookmarkService.importLink({ url: 'x', source: 'youtube' })).rejects.toThrow(/too quickly/);

    http.request.mockRejectedValueOnce(new AxiosError('Network Error'));
    const error = await bookmarkService.importLink({ url: 'x', source: 'youtube' }).catch((e) => e);
    expect(error).toBeInstanceOf(BookmarkServiceError);
    expect(error.message).toMatch(/reach PrepPros/);
  });
});
