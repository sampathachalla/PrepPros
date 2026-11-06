import { apiRequest } from '@/app/shared/services/apiClient';
import type { CreateRecipeInput, Recipe } from '../types/recipes';

/** Recipes Service layer: talks to api/src/modules/recipes. */
export const recipeService = {
  list: () => apiRequest<Recipe[]>({ method: 'GET', url: '/recipes' }),
  create: (data: CreateRecipeInput) => apiRequest<Recipe>({ method: 'POST', url: '/recipes', data }),
  remove: (id: string) => apiRequest<void>({ method: 'DELETE', url: `/recipes/${id}` }),
  /** Liking a recipe saves it to the person's bookmarks. */
  setLiked: (id: string, liked: boolean) =>
    apiRequest<unknown>({ method: liked ? 'PUT' : 'DELETE', url: `/recipes/${id}/bookmark` }),
};
