import type { SignupCredentials } from '../types/auth';

export function validateLogin(identifier: string, password: string): string | null {
  if (!identifier.trim()) return 'Enter your email or username.';
  if (!password) return 'Enter your password.';
  return null;
}

export function validateSignup(credentials: SignupCredentials): string | null {
  if (!/^\S+@\S+\.\S+$/.test(credentials.email.trim())) {
    return 'Enter a valid email address.';
  }
  if (credentials.password.length < 8) {
    return 'Password must contain at least 8 characters.';
  }
  if (credentials.password !== credentials.confirmPassword) {
    return 'Passwords do not match.';
  }
  return null;
}
