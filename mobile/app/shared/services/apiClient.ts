import axios, { isAxiosError, type AxiosRequestConfig } from 'axios';
import { clearAuthUser, getAuthUser, saveAuthUser } from '@/app/auth/store/authSession';
import { API_TIMEOUT_MS, API_URL } from '../constants/api';

/** Refresh this long before the token expires, so a request never races the expiry. */
const REFRESH_MARGIN_MS = 60_000;

/** An error whose message can be shown to the user. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === 'string') return new ApiError(detail, status);
    if (!error.response) return new ApiError('Can’t reach PrepPros. Check your connection.');
    return new ApiError('Something went wrong. Please try again.', status);
  }
  return new ApiError('Something went wrong. Please try again.');
}

type SessionExpiredListener = () => void;
const sessionExpiredListeners = new Set<SessionExpiredListener>();

/** Called when the session can't be renewed and the person has to log in again. */
export function onSessionExpired(listener: SessionExpiredListener) {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

let refreshing: Promise<string | null> | null = null;

/**
 * Swaps the refresh token for a new session. Supabase rotates refresh tokens and rejects reused ones,
 * so requests that all find an expired token must share one refresh.
 */
function refreshSession(): Promise<string | null> {
  refreshing ??= (async () => {
    const user = await getAuthUser();
    if (!user?.refreshToken) return null;
    try {
      const { data } = await axios.post(
        `${API_URL}/auth/refresh`,
        { refreshToken: user.refreshToken },
        { timeout: API_TIMEOUT_MS },
      );
      await saveAuthUser({
        ...user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
      });
      return data.accessToken as string;
    } catch (error) {
      // Only a rejected token ends the session; being offline must not log anyone out
      if (isAxiosError(error) && error.response?.status === 401) {
        await clearAuthUser();
        sessionExpiredListeners.forEach((listener) => listener());
        return null;
      }
      throw error;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/** A token that is good for at least another minute, or null when nobody is signed in. */
export async function getAccessToken(): Promise<string | null> {
  const user = await getAuthUser();
  if (!user?.accessToken) return null;
  const expiresAt = user.expiresAt ? new Date(user.expiresAt).getTime() : Infinity;
  if (expiresAt - Date.now() > REFRESH_MARGIN_MS) return user.accessToken;
  return (await refreshSession()) ?? null;
}

/** Calls the API as the signed-in person, renewing the session once if the token is refused. */
export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  const send = async (token: string | null) => {
    const { data } = await axios.request<T>({
      baseURL: API_URL,
      timeout: API_TIMEOUT_MS,
      ...config,
      headers: token ? { ...config.headers, Authorization: `Bearer ${token}` } : config.headers,
    });
    return data;
  };

  try {
    const token = await getAccessToken();
    try {
      return await send(token);
    } catch (error) {
      if (!token || !isAxiosError(error) || error.response?.status !== 401) throw error;
      const renewed = await refreshSession();
      if (!renewed) throw new ApiError('Please log in again.', 401);
      return await send(renewed);
    }
  } catch (error) {
    throw toApiError(error);
  }
}
