import { Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../utils/AppError.js';
import { toUserResponse } from '../auth/service.js';
import * as repository from './repository.js';
import type { UpdatePreferencesInput, UpdateProfileInput } from './schema.js';

const accountGone = () => new AppError(401, 'This account no longer exists');
const usernameTaken = () => new AppError(409, 'This username is taken.');

export async function getProfile(userId: string) {
  const user = await repository.findUser(userId);
  if (!user) throw accountGone();
  const [preferences, counts] = await Promise.all([
    repository.getOrCreatePreferences(userId),
    repository.countStats(userId),
  ]);

  return {
    ...toUserResponse(user),
    preferences,
    stats: counts,
  };
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  if (input.username) {
    const owner = await repository.findUserByUsername(input.username);
    if (owner && owner.id !== userId) throw usernameTaken();
  }
  try {
    await repository.updateUser(userId, input);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') throw usernameTaken();
      if (error.code === 'P2025') throw accountGone();
    }
    throw error;
  }
  return getProfile(userId);
}

export async function updatePreferences(userId: string, input: UpdatePreferencesInput) {
  if (!(await repository.findUser(userId))) throw accountGone();
  return repository.updatePreferences(userId, input);
}
