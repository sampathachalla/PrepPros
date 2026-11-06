import { z } from 'zod';
import { dateKeySchema } from '../../utils/dates.js';

export const mealPrepQuerySchema = z.object({ weekStart: dateKeySchema });
export const prepDishParamsSchema = z.object({ id: z.uuid('Invalid dish') });

export const updatePrepDishSchema = z
  .object({
    prepStatus: z.enum(['todo', 'in_progress', 'done']).optional(),
    assigneeId: z.uuid().nullable().optional(),
  })
  .refine((input) => input.prepStatus !== undefined || input.assigneeId !== undefined, 'Nothing to update');

export const shoppingCheckSchema = z.object({
  weekStart: dateKeySchema,
  key: z.string().trim().min(1).max(200),
  checked: z.boolean(),
});

export type UpdatePrepDishInput = z.infer<typeof updatePrepDishSchema>;
