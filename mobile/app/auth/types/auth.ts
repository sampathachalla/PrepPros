export type UserRole = 'Trainer' | 'Member';

export type AuthUser = {
  id: string;
  username: string;
  email?: string;
  role?: UserRole;
  displayName?: string | null;
  avatarColor?: string | null;
  /** Supabase session for the PrepPros API; renewed automatically by `apiRequest`. */
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
};

export type LoginCredentials = {
  identifier: string;
  password: string;
};

export type SignupCredentials = {
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
};
