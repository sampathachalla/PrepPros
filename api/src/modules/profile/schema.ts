import { z } from 'zod';
import { roleSchema, usernameSchema } from '../auth/schema.js';

export const updateProfileSchema = z.object({
  username: usernameSchema.optional(),
  role: roleSchema.optional(),
  displayName: z.string().trim().min(1, 'Enter a name').max(40, 'That name is too long').optional(),
  avatarColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Choose a colour')
    .optional(),
});

export const updatePreferencesSchema = z.object({
  mealReminders: z.boolean().optional(),
  showPrepTips: z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
