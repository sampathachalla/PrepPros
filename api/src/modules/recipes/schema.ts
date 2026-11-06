import { z } from 'zod';

export const RECIPE_CATEGORIES = [
  'high_protein',
  'quick_prep',
  'breakfast',
  'lunch_dinner',
  'vegetarian',
  'snacks',
] as const;

export const createRecipeSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, 'Recipe title must be at least 2 characters')
    .max(100, 'Recipe title is too long'),
  // The app's "All" filter can be sent as a category; such recipes are filed under Lunch & Dinner
  category: z
    .enum(['all', ...RECIPE_CATEGORIES])
    .transform((category) => (category === 'all' ? 'lunch_dinner' : category)),
  prepTimeMinutes: z
    .number()
    .int()
    .min(1, 'Prep time must be at least 1 minute')
    .max(360, 'Prep time cannot exceed 6 hours'),
  cookTimeMinutes: z.number().int().min(0).max(360).optional(),
  servings: z.number().int().min(1, 'Servings must be at least 1').max(50, 'Servings cannot exceed 50'),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).default('Easy'),
  /** One ingredient per line. */
  ingredientsText: z.string().trim().min(3, 'Please enter at least one ingredient').max(5000),
  /** One step per line. */
  instructionsText: z.string().trim().min(5, 'Please enter cooking instructions').max(10000),
  imageUrl: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .pipe(z.url({ protocol: /^https?$/ }).optional()),
});

export const listRecipesQuerySchema = z.object({
  category: z.enum(['all', ...RECIPE_CATEGORIES]).default('all'),
  search: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => value || undefined),
});

export const recipeIdParamsSchema = z.object({
  id: z.uuid('Invalid recipe id'),
});

export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export type ListRecipesQuery = z.infer<typeof listRecipesQuerySchema>;
