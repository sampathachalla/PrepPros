import type { UserRole } from '../types/auth';

export const AUTH_COPY = {
  appName: 'PrepPros',
  tagline: 'Prepare smarter with PrepPros',
  signupSubtitle: 'Join the PrepPros community today',
} as const;

export const USER_ROLES: UserRole[] = ['Trainer', 'Member'];
