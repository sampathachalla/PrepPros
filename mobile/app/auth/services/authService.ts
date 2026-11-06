import axios from 'axios';
import { API_TIMEOUT_MS, API_URL } from '@/app/shared/constants/api';
import { apiRequest, toApiError } from '@/app/shared/services/apiClient';
import { clearAuthUser, saveAuthUser } from '../store/authSession';
import type { AuthUser, LoginCredentials, SignupCredentials, UserRole } from '../types/auth';
import { normalizeIdentifier } from '../utils/normalizeIdentifier';

interface ApiUser {
  id: string;
  email: string;
  username: string | null;
  role: UserRole;
  displayName: string | null;
  avatarColor: string | null;
}

interface SessionResponse {
  user: ApiUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

function post<T>(path: string, body: object): Promise<T> {
  return axios
    .post<T>(`${API_URL}${path}`, body, { timeout: API_TIMEOUT_MS })
    .then(({ data }) => data)
    .catch((error) => {
      throw toApiError(error);
    });
}

async function startSession({ user, accessToken, refreshToken, expiresAt }: SessionResponse): Promise<AuthUser> {
  const authUser: AuthUser = {
    id: user.id,
    username: user.username ?? user.email.split('@')[0],
    email: user.email,
    role: user.role,
    displayName: user.displayName,
    avatarColor: user.avatarColor,
    accessToken,
    refreshToken,
    expiresAt,
  };
  await saveAuthUser(authUser);
  return authUser;
}

export async function login(credentials: LoginCredentials): Promise<AuthUser> {
  const identifier = normalizeIdentifier(credentials.identifier);
  return startSession(await post<SessionResponse>('/auth/login', { identifier, password: credentials.password }));
}

/** Creates the account. With email confirmation on there is no session yet: the person confirms, then logs in. */
export async function signup(credentials: SignupCredentials) {
  const result = await post<Partial<SessionResponse> & { emailConfirmationRequired: boolean }>('/auth/signup', {
    email: credentials.email.trim(),
    password: credentials.password,
    confirmPassword: credentials.confirmPassword,
    role: credentials.role,
  });
  if (!result.emailConfirmationRequired) await startSession(result as SessionResponse);
  return { emailConfirmationRequired: result.emailConfirmationRequired };
}

/** Sends the confirmation email again, for someone who lost it. */
export async function resendConfirmation(identifier: string) {
  await post('/auth/resend-confirmation', { identifier: normalizeIdentifier(identifier) });
}

/** Ends the session on the server too, but logging out always works here, even offline. */
export async function logout() {
  await apiRequest({ method: 'POST', url: '/auth/logout' }).catch(() => undefined);
  await clearAuthUser();
}
