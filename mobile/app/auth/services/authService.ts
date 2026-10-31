import { DEMO_CREDENTIALS } from '../constants/auth';
import { saveAuthUser } from '../store/authSession';
import type { AuthUser, LoginCredentials, SignupCredentials } from '../types/auth';
import { normalizeIdentifier } from '../utils/normalizeIdentifier';

export async function login(credentials: LoginCredentials): Promise<AuthUser> {
  const identifier = normalizeIdentifier(credentials.identifier);
  if (
    identifier !== DEMO_CREDENTIALS.identifier ||
    credentials.password !== DEMO_CREDENTIALS.password
  ) {
    throw new Error('Invalid credentials.');
  }

  const user = { id: 'u123456', username: identifier };
  await saveAuthUser(user);
  return user;
}

export async function signup(credentials: SignupCredentials): Promise<AuthUser> {
  const user = {
    id: `u-${Date.now()}`,
    username: normalizeIdentifier(credentials.email),
    role: credentials.role,
  };
  await saveAuthUser(user);
  return user;
}
