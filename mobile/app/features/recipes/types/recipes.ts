import type { MealCategory } from '../../calendar/types/calendar';

export type RecipeCategory =
  | 'all'
  | 'high_protein'
  | 'quick_prep'
  | 'breakfast'
  | 'lunch_dinner'
  | 'vegetarian'
  | 'snacks';

export interface Ingredient {
  id: string;
  name: string;
  amount?: string;
  isChecked?: boolean;
}

export interface CookingStep {
  stepNumber: number;
  instruction: string;
}

export interface Recipe {
  id: string;
  title: string;
  category: RecipeCategory;
  prepTimeMinutes: number;
  cookTimeMinutes?: number;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  imageUrl: string;
  isBookmarked: boolean;
  isCustom?: boolean;
  ingredients: Ingredient[];
  steps: CookingStep[];
  createdAt: string;
}

export interface CreateRecipeInput {
  title: string;
  category: RecipeCategory;
  prepTimeMinutes: number;
  cookTimeMinutes?: number;
  servings: number;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  ingredientsText: string; // Line-separated ingredients
  instructionsText: string; // Line-separated steps
  imageUrl?: string;
}

export interface AddRecipeToCalendarPayload {
  recipe: Recipe;
  date: string; // YYYY-MM-DD
  category: MealCategory;
}
