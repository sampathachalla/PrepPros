import { z } from 'zod';
import type { CreateRecipeInput } from '../types/recipes';

export const createRecipeSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, 'Recipe title must be at least 2 characters')
    .max(100, 'Recipe title is too long'),
  category: z.enum([
    'all',
    'high_protein',
    'quick_prep',
    'breakfast',
    'lunch_dinner',
    'vegetarian',
    'snacks',
  ]),
  prepTimeMinutes: z
    .number()
    .min(1, 'Prep time must be at least 1 minute')
    .max(360, 'Prep time cannot exceed 6 hours'),
  cookTimeMinutes: z.number().min(0).max(360).optional(),
  servings: z
    .number()
    .min(1, 'Servings must be at least 1')
    .max(50, 'Servings cannot exceed 50'),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
  ingredientsText: z
    .string()
    .trim()
    .min(3, 'Please enter at least one ingredient'),
  instructionsText: z
    .string()
    .trim()
    .min(5, 'Please enter cooking instructions'),
  imageUrl: z.string().optional(),
});

export function validateRecipeInput(input: unknown): {
  error?: string;
  data?: CreateRecipeInput;
} {
  const result = createRecipeSchema.safeParse(input);
  if (!result.success) {
    const firstIssue = result.error.issues?.[0];
    return { error: firstIssue?.message ?? 'Invalid recipe details' };
  }
  return { data: result.data as CreateRecipeInput };
}
