import { prisma } from '../../config/db.js';
import { earliestEditableDate } from '../../utils/dates.js';

const withMembers = {
  members: {
    orderBy: { joinedAt: 'asc' },
    include: {
      user: { select: { id: true, username: true, email: true, displayName: true, avatarColor: true } },
    },
  },
} as const;

export function findMembership(userId: string) {
  return prisma.householdMember.findUnique({ where: { userId } });
}

export function findHouseholdById(id: string) {
  return prisma.household.findUnique({ where: { id }, include: withMembers });
}

export function findHouseholdByCode(inviteCode: string) {
  return prisma.household.findUnique({ where: { inviteCode }, include: withMembers });
}

export function createHousehold(userId: string, name: string, inviteCode: string) {
  return prisma.household.create({
    data: { name, inviteCode, members: { create: { userId, role: 'admin' } } },
    include: withMembers,
  });
}

export function findUserIdByEmail(email: string) {
  return prisma.user.findUnique({ where: { email }, select: { id: true } });
}

export function addMember(householdId: string, userId: string) {
  return prisma.householdMember.create({ data: { householdId, userId } });
}

export function updateHousehold(id: string, data: { name?: string; inviteCode?: string }) {
  return prisma.household.update({ where: { id }, data, include: withMembers });
}

export function deleteHousehold(id: string) {
  return prisma.household.delete({ where: { id } });
}

/**
 * Takes someone out of the household. Their answers for meals still to come go with them, so the cook
 * isn't told to make their portion; past days stay as they were.
 */
export function removeMember(householdId: string, userId: string) {
  const fromDate = earliestEditableDate();
  return prisma.$transaction([
    prisma.mealResponse.deleteMany({ where: { householdId, userId, date: { gte: fromDate } } }),
    prisma.plannedDish.updateMany({
      where: { householdId, prepAssigneeId: userId },
      data: { prepAssigneeId: null },
    }),
    prisma.householdMember.deleteMany({ where: { householdId, userId } }),
  ]);
}

export function transferAdmin(householdId: string, fromUserId: string, toUserId: string) {
  return prisma.$transaction([
    prisma.householdMember.updateMany({ where: { householdId, userId: fromUserId }, data: { role: 'member' } }),
    prisma.householdMember.updateMany({ where: { householdId, userId: toUserId }, data: { role: 'admin' } }),
  ]);
}
