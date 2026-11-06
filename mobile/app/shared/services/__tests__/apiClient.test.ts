import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import axios, { AxiosError, type AxiosResponse } from 'axios';
import { getAuthUser, saveAuthUser } from '@/app/auth/store/authSession';
import { ApiError, apiRequest, getAccessToken, onSessionExpired } from '../apiClient';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('axios', () => ({
  ...jest.requireActual('axios'),
  __esModule: true,
  default: { request: jest.fn(), post: jest.fn() },
}));

const http = jest.mocked(axios);

const httpError = (status: number) =>
  new AxiosError('failed', undefined, undefined, undefined, { status, data: {} } as AxiosResponse);

const signIn = (expiresInMs = 3_600_000) =>
  saveAuthUser({
    id: 'u1',
    username: 'priya',
    accessToken: 'old-token',
    refreshToken: 'refresh-1',
    expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
  });

const renewed = {
  data: {
    accessToken: 'new-token',
    refreshToken: 'refresh-2',
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  },
};

describe('apiClient', () => {
  beforeEach(async () => {
    http.request.mockReset();
    http.post.mockReset();
    await mockAsyncStorage.clear();
  });

  it('uses a token that is still good', async () => {
    await signIn();
    expect(await getAccessToken()).toBe('old-token');
    expect(http.post).not.toHaveBeenCalled();
  });

  it('renews a token about to expire, and keeps the new refresh token', async () => {
    await signIn(10_000);
    http.post.mockResolvedValue(renewed);

    expect(await getAccessToken()).toBe('new-token');
    expect((await getAuthUser())?.refreshToken).toBe('refresh-2');
  });

  it('shares one refresh between requests, because refresh tokens work only once', async () => {
    await signIn(10_000);
    http.post.mockResolvedValue(renewed);
    http.request.mockResolvedValue({ data: 'ok' });

    await Promise.all([apiRequest({ url: '/a' }), apiRequest({ url: '/b' }), apiRequest({ url: '/c' })]);

    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it('renews once and retries when the server refuses a token', async () => {
    await signIn();
    http.request.mockRejectedValueOnce(httpError(401)).mockResolvedValueOnce({ data: 'ok' });
    http.post.mockResolvedValue(renewed);

    expect(await apiRequest({ url: '/a' })).toBe('ok');
    expect(http.request.mock.calls[1][0].headers).toEqual({ Authorization: 'Bearer new-token' });
  });

  it('logs out when the session really is over', async () => {
    await signIn(10_000);
    http.post.mockRejectedValue(httpError(401));
    const expired = jest.fn();
    const unsubscribe = onSessionExpired(expired);

    await expect(getAccessToken()).resolves.toBeNull();

    expect(expired).toHaveBeenCalledTimes(1);
    expect(await getAuthUser()).toBeNull();
    unsubscribe();
  });

  it('does not log anyone out for being offline', async () => {
    await signIn(10_000);
    http.post.mockRejectedValue(new AxiosError('Network Error'));

    await expect(apiRequest({ url: '/a' })).rejects.toThrow(/reach PrepPros/);

    expect((await getAuthUser())?.refreshToken).toBe('refresh-1');
  });

  it('passes on the server’s own message', async () => {
    await signIn();
    const error = new AxiosError('failed', undefined, undefined, undefined, {
      status: 403,
      data: { detail: 'Only the household admin can do this' },
    } as AxiosResponse);
    http.request.mockRejectedValue(error);

    const caught = (await apiRequest({ url: '/a' }).catch((e: unknown) => e)) as ApiError;

    expect(caught).toBeInstanceOf(ApiError);
    expect(caught.message).toBe('Only the household admin can do this');
    expect(caught.status).toBe(403);
  });
});
