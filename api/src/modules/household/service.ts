import { randomBytes } from 'node:crypto';
import { Prisma, type HouseholdMember } from '../../generated/prisma/client.js';
import { AppError, notFound } from '../../utils/AppError.js';
import * as repository from './repository.js';
import { MAX_HOUSEHOLD_MEMBERS } from './schema.js';

/** Leaves out letters and digits that are easy to confuse when read aloud. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;
const AVATAR_COLORS = ['#F5AFC4', '#A8DDF5', '#EE93AF', '#7CC8EC', '#F7C9D8', '#C6E9F8'];

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

const alreadyInHousehold = () => new AppError(409, 'You are already in a household. Leave it first.');

const personInAnotherHousehold = () => new AppError(409, 'This person is already in another household.');

function newInviteCode() {
  return [...randomBytes(CODE_LENGTH)].map((byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
}

type HouseholdWithMembers = NonNullable<Awaited<ReturnType<typeof repository.findHouseholdById>>>;

function initialsOf(name: string) {
  const words = name.replace(/[._]/g, ' ').trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? `${words[0][0]}${words[1][0]}` : (words[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}

/** Same shape as the mobile app's `Household` type. */
function toHouseholdResponse(household: HouseholdWithMembers, viewerId: string) {
  const members = household.members.map(({ user, role, joinedAt }, index) => {
    const name = user.displayName ?? user.username ?? user.email.split('@')[0];
    return {
      id: user.id,
      name,
      initials: initialsOf(name),
      color: user.avatarColor ?? AVATAR_COLORS[index % AVATAR_COLORS.length],
      role,
      joinedAt: joinedAt.toISOString(),
    };
  });
  return {
    id: household.id,
    name: household.name,
    inviteCode: household.inviteCode,
    inviteLink: `preppros://join/${household.inviteCode}`,
    myId: viewerId,
    myRole: household.members.find((member) => member.userId === viewerId)?.role ?? 'member',
    maxMembers: MAX_HOUSEHOLD_MEMBERS,
    members,
  };
}

/** The caller's place in a household, or a 409 telling them they need one. */
export async function requireMembership(userId: string): Promise<HouseholdMember> {
  const membership = await repository.findMembership(userId);
  if (!membership) throw new AppError(409, 'Create or join a household first');
  return membership;
}

export function requireAdmin(membership: HouseholdMember) {
  if (membership.role !== 'admin') throw new AppError(403, 'Only the household admin can do this');
}

export async function getHousehold(userId: string) {
  const membership = await repository.findMembership(userId);
  if (!membership) return { household: null };
  const household = await repository.findHouseholdById(membership.householdId);
  return { household: household && toHouseholdResponse(household, userId) };
}

export async function createHousehold(userId: string, name: string) {
  if (await repository.findMembership(userId)) throw alreadyInHousehold();
  try {
    return { household: toHouseholdResponse(await repository.createHousehold(userId, name, newInviteCode()), userId) };
  } catch (error) {
    // Two taps at once: the unique user id keeps it to one household
    if (isUniqueViolation(error)) throw alreadyInHousehold();
    throw error;
  }
}

export async function joinHousehold(userId: string, code: string) {
  if (await repository.findMembership(userId)) throw alreadyInHousehold();
  const household = await repository.findHouseholdByCode(code);
  if (!household) throw new AppError(404, 'That invite link is not valid. Ask for a new one.');
  if (household.members.length >= MAX_HOUSEHOLD_MEMBERS) {
    throw new AppError(409, `This household is full (${MAX_HOUSEHOLD_MEMBERS} people)`);
  }
  try {
    await repository.addMember(household.id, userId);
  } catch (error) {
    if (isUniqueViolation(error)) throw alreadyInHousehold();
    throw error;
  }
  return getHousehold(userId);
}

/**
 * The admin adds someone who already has an account. Looking up accounts by email is limited to the
 * admin of a household with room, and rate limited, because the answer shows whether an email is registered.
 */
export async function addMemberByEmail(adminId: string, email: string) {
  const membership = await requireMembership(adminId);
  requireAdmin(membership);
  const household = await repository.findHouseholdById(membership.householdId);
  if ((household?.members.length ?? 0) >= MAX_HOUSEHOLD_MEMBERS) {
    throw new AppError(409, `This household is full (${MAX_HOUSEHOLD_MEMBERS} people)`);
  }

  const user = await repository.findUserIdByEmail(email);
  if (!user) throw new AppError(404, 'No PrepPros account uses this email. Send them the invite link instead.');

  const existing = await repository.findMembership(user.id);
  if (existing?.householdId === membership.householdId) {
    throw new AppError(409, 'This person is already in your household.');
  }
  if (existing) throw personInAnotherHousehold();
  try {
    await repository.addMember(membership.householdId, user.id);
  } catch (error) {
    // They joined somewhere else at the same moment
    if (isUniqueViolation(error)) throw personInAnotherHousehold();
    throw error;
  }
  return getHousehold(adminId);
}

export async function renameHousehold(userId: string, name: string) {
  const membership = await requireMembership(userId);
  requireAdmin(membership);
  return { household: toHouseholdResponse(await repository.updateHousehold(membership.householdId, { name }), userId) };
}

/** Replaces the invite code, so links already shared stop working. */
export async function resetInvite(userId: string) {
  const membership = await requireMembership(userId);
  requireAdmin(membership);
  const household = await repository.updateHousehold(membership.householdId, { inviteCode: newInviteCode() });
  return { household: toHouseholdResponse(household, userId) };
}

/** Admins hand over first; the last person leaving closes the household. */
export async function leaveHousehold(userId: string) {
  const membership = await requireMembership(userId);
  const household = await repository.findHouseholdById(membership.householdId);
  if (membership.role === 'admin') {
    if ((household?.members.length ?? 0) > 1) {
      throw new AppError(409, 'Make someone else the admin before you leave');
    }
    await repository.deleteHousehold(membership.householdId);
    return;
  }
  await repository.removeMember(membership.householdId, userId);
}

async function requireOtherMember(householdId: string, userId: string) {
  const target = await repository.findMembership(userId);
  if (!target || target.householdId !== householdId) throw notFound('Member');
  return target;
}

export async function removeMember(adminId: string, userId: string) {
  const membership = await requireMembership(adminId);
  requireAdmin(membership);
  if (userId === adminId) throw new AppError(400, 'Use Leave household to remove yourself');
  await requireOtherMember(membership.householdId, userId);
  await repository.removeMember(membership.householdId, userId);
  return getHousehold(adminId);
}

export async function makeAdmin(adminId: string, userId: string) {
  const membership = await requireMembership(adminId);
  requireAdmin(membership);
  if (userId === adminId) throw new AppError(400, 'You are already the admin');
  await requireOtherMember(membership.householdId, userId);
  await repository.transferAdmin(membership.householdId, adminId, userId);
  return getHousehold(adminId);
}
