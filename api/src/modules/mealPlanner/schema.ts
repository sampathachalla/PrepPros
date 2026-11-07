import { z } from 'zod';
import { dateKeySchema } from '../../utils/dates.js';

export const MEAL_TYPES = ['breakfast', 'lunch', 'snacks', 'dinner'] as const;
export const mealSchema = z.enum(MEAL_TYPES, 'Choose breakfast, lunch, snacks or dinner');

export const dishCatalogFilterSchema = z.enum(['liked', 'recently_added', 'suggested']);
export const slotPolicyStatusSchema = z.enum(['available', 'reserved']);
export const bulkStrategySchema = z.enum(['member_complete', 'union', 'intersection']);

export const slotCoordSchema = z.object({
  date: dateKeySchema,
  meal: mealSchema,
});

export const dishCatalogQuerySchema = z.object({
  weekStart: dateKeySchema,
  filter: dishCatalogFilterSchema.optional(),
  q: z.string().trim().max(150).optional(),
});

export const weekParamsSchema = z.object({
  weekStart: dateKeySchema,
});

export const slotParamsSchema = z.object({
  date: dateKeySchema,
  meal: mealSchema,
});

export const dishItemInputSchema = z.object({
  dishKey: z.string().trim().min(1).max(200),
  recipeId: z.uuid().nullable().optional(),
  bookmarkId: z.uuid().nullable().optional(),
  fromDishId: z.uuid().nullable().optional(),
  name: z.string().trim().min(1).max(150),
  imageUrl: z.string().max(2000).optional(),
  prepMinutes: z.number().int().min(0).max(1440).optional(),
  cookMinutes: z.number().int().min(0).max(1440).optional(),
  baseServings: z.number().int().min(1).max(100).optional(),
  ingredients: z.array(z.string()).optional(),
  steps: z.array(z.string()).optional(),
});

export const saveDishSelectionsSchema = z.object({
  dish: dishItemInputSchema,
  addSlots: z.array(slotCoordSchema).max(28),
  removeSlots: z.array(slotCoordSchema).max(28).default([]),
});

export const setSlotChoiceSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('join_proposal'),
    proposalId: z.uuid('Invalid proposal ID'),
  }),
  z.object({
    mode: z.literal('use_own_meal'),
    dishes: z.array(dishItemInputSchema).max(12).optional(),
  }),
]);

export const updateSlotPoliciesSchema = z.object({
  submissionDeadline: z.iso.datetime().nullable().optional(),
  slots: z
    .array(
      z.object({
        date: dateKeySchema,
        meal: mealSchema,
        status: slotPolicyStatusSchema,
      }),
    )
    .max(28),
});

export const bulkAssignSchema = z.object({
  dryRun: z.boolean().default(false),
  slots: z.array(slotCoordSchema).min(1, 'Select at least one slot').max(28),
  strategy: bulkStrategySchema,
  sourceMemberIds: z.array(z.uuid()).max(20).default([]),
});

export const updateSlotDraftSchema = z.object({
  dishes: z.array(dishItemInputSchema).max(15),
  sourceNote: z.string().trim().max(200).nullable().optional(),
});

export const publishWeekSchema = z.object({
  allowIncomplete: z.boolean().default(false),
});

export type DishCatalogQuery = z.infer<typeof dishCatalogQuerySchema>;
export type DishItemInput = z.infer<typeof dishItemInputSchema>;
export type SaveDishSelectionsInput = z.infer<typeof saveDishSelectionsSchema>;
export type SetSlotChoiceInput = z.infer<typeof setSlotChoiceSchema>;
export type UpdateSlotPoliciesInput = z.infer<typeof updateSlotPoliciesSchema>;
export type BulkAssignInput = z.infer<typeof bulkAssignSchema>;
export type UpdateSlotDraftInput = z.infer<typeof updateSlotDraftSchema>;
export type PublishWeekInput = z.infer<typeof publishWeekSchema>;
