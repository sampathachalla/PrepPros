import { z } from 'zod';
import { emailSchema } from '../auth/schema.js';

export const MAX_HOUSEHOLD_MEMBERS = 6;

const householdName = z
  .string()
  .trim()
  .min(2, 'Household name must be at least 2 characters')
  .max(60, 'Household name is too long');

export const createHouseholdSchema = z.object({ name: householdName });
export const updateHouseholdSchema = z.object({ name: householdName });

/** Takes the code on its own or a whole invite link: `preppros://join/ABCD2345`, `.../join?code=ABCD2345`. */
export const joinHouseholdSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Paste your invite link or code')
    .max(300)
    .transform((value) => {
      const fromQuery = value.match(/[?&]code=([^&#]+)/)?.[1];
      const lastSegment = value.split(/[?#]/)[0].split('/').filter(Boolean).pop();
      return (fromQuery ?? lastSegment ?? '').toUpperCase();
    }),
});

export const addMemberSchema = z.object({ email: emailSchema });

export const memberParamsSchema = z.object({ userId: z.uuid('Invalid member') });
