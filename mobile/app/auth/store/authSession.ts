import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthUser } from '../types/auth';

const AUTH_USER_KEY = 'userInfo';

export async function saveAuthUser(user: AuthUser): Promise<void> {
  await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export async function clearAuthUser(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_USER_KEY);
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const storedUser = await AsyncStorage.getItem(AUTH_USER_KEY);
  return storedUser ? (JSON.parse(storedUser) as AuthUser) : null;
}
