import type { RecipeCategory } from '../types/recipes';

export const RECIPE_CATEGORIES: { key: RecipeCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'high_protein', label: 'High Protein' },
  { key: 'quick_prep', label: 'Quick Prep' },
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch_dinner', label: 'Lunch & Dinner' },
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'snacks', label: 'Snacks' },
];
