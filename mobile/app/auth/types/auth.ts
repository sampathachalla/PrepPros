export type UserRole = 'Trainer' | 'Member';

export type AuthUser = {
  id: string;
  username: string;
  role?: UserRole;
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
