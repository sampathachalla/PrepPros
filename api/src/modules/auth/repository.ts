import { prisma } from '../../config/db.js';
import type { UserRole } from '../../generated/prisma/client.js';

export const publicUserSelect = {
  id: true,
  email: true,
  username: true,
  role: true,
  displayName: true,
  avatarColor: true,
  createdAt: true,
} as const;

export function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id }, select: publicUserSelect });
}

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email }, select: publicUserSelect });
}

export function findUserByUsername(username: string) {
  return prisma.user.findUnique({ where: { username }, select: publicUserSelect });
}

/** The account facts Supabase owns, copied here so they can be queried with the rest of the user. */
export interface AccountDetails {
  authProvider: string;
  emailConfirmedAt: Date | null;
}

/** Creates the profile of a Supabase account, with default preferences. */
export function createProfile(
  data: { id: string; email: string; username: string | null; role: UserRole } & AccountDetails,
) {
  return prisma.user.create({
    data: { ...data, preferences: { create: {} } },
    select: publicUserSelect,
  });
}

export async function recordLogin(id: string, details: AccountDetails) {
  await prisma.user.update({ where: { id }, data: { ...details, lastLoginAt: new Date() } });
}
