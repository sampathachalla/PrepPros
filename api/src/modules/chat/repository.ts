import { prisma } from '../../config/db.js';
import type { Prisma } from '../../generated/prisma/client.js';

export function createRunningSession(userId: string | null, query: string) {
  return prisma.researchSession.create({
    data: { userId, query, status: 'running' },
    select: { id: true },
  });
}

export function completeSession(id: string, result: Prisma.InputJsonValue) {
  return prisma.researchSession.update({
    where: { id },
    data: { status: 'completed', result, updatedAt: new Date() },
  });
}

export function failSession(id: string) {
  return prisma.researchSession.update({
    where: { id },
    data: { status: 'failed', updatedAt: new Date() },
  });
}
