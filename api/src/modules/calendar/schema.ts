import { z } from 'zod';
import { dateKeySchema, toDbDate } from '../../utils/dates.js';

const MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'] as const;
/** Long enough for a month view with its neighbouring days. */
const MAX_RANGE_DAYS = 62;
const MIN_TIMER_MINUTES = 5;
const MAX_TIMER_MINUTES = 7 * 24 * 60;

export const meal = z.enum(MEALS, 'Choose breakfast, lunch, dinner or snacks');

export const calendarRangeSchema = z
  .object({ from: dateKeySchema, to: dateKeySchema })
  .refine(({ from, to }) => from <= to, 'The range ends before it starts')
  .refine(
    ({ from, to }) => (toDbDate(to).getTime() - toDbDate(from).getTime()) / 86_400_000 <= MAX_RANGE_DAYS,
    `Ask for at most ${MAX_RANGE_DAYS} days at a time`,
  );

/** A dish comes from exactly one place: a recipe, a saved link, an earlier dish, or a typed name. */
export const addDishSchema = z
  .object({
    date: dateKeySchema,
    meal,
    recipeId: z.uuid().optional(),
    bookmarkId: z.uuid().optional(),
    fromDishId: z.uuid().optional(),
    name: z.string().trim().min(2, 'Dish name must be at least 2 characters').max(150).optional(),
    notes: z.string().trim().max(500).optional(),
    /** Your own dish on this meal, which the new one takes the place of. */
    replacesDishId: z.uuid().optional(),
  })
  .refine(
    (input) => [input.recipeId, input.bookmarkId, input.fromDishId, input.name].filter(Boolean).length === 1,
    'Pick a dish or type its name',
  );

export const dishParamsSchema = z.object({ id: z.uuid('Invalid dish') });
export const dayParamsSchema = z.object({ date: dateKeySchema });
export const decisionSchema = z.object({ approve: z.boolean() });

export const startTimerSchema = z.object({
  dates: z.array(dateKeySchema).min(1, 'Choose at least one day').max(31),
  durationMinutes: z
    .number()
    .int()
    .min(MIN_TIMER_MINUTES, `The timer must run for at least ${MIN_TIMER_MINUTES} minutes`)
    .max(MAX_TIMER_MINUTES, 'The timer can run for at most 7 days'),
});

export const dishOptionsQuerySchema = z.object({ meal });

export type AddDishInput = z.infer<typeof addDishSchema>;
export type MealInput = z.infer<typeof meal>;
