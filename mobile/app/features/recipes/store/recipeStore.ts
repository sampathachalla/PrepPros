import { create } from 'zustand';
import { ApiError } from '@/app/shared/services/apiClient';
import { useBookmarkStore } from '../../bookmarks/store/bookmarkStore';
import { recipeService } from '../services/recipeService';
import type { CreateRecipeInput, Recipe } from '../types/recipes';

interface RecipeState {
  recipes: Recipe[];
  isLoading: boolean;
  loadError: string | null;

  loadRecipes: () => Promise<void>;
  toggleBookmark: (recipeId: string) => Promise<void>;
  addCustomRecipe: (input: CreateRecipeInput) => Promise<Recipe>;
  deleteCustomRecipe: (recipeId: string) => Promise<void>;
  getRecipeById: (id: string) => Recipe | undefined;
  clear: () => void;
}

const initialState = { recipes: [], isLoading: true, loadError: null };

export const useRecipeStore = create<RecipeState>()((set, get) => ({
  ...initialState,

  loadRecipes: async () => {
    try {
      set({ recipes: await recipeService.list(), isLoading: false, loadError: null });
    } catch (error) {
      set({ isLoading: false, loadError: error instanceof ApiError ? error.message : 'Could not load recipes.' });
    }
  },

  toggleBookmark: async (recipeId) => {
    const recipe = get().recipes.find((r) => r.id === recipeId);
    if (!recipe) return;
    const setLiked = (isBookmarked: boolean) =>
      set((state) => ({ recipes: state.recipes.map((r) => (r.id === recipeId ? { ...r, isBookmarked } : r)) }));

    setLiked(!recipe.isBookmarked);
    try {
      await recipeService.setLiked(recipeId, !recipe.isBookmarked);
      await useBookmarkStore.getState().loadBookmarks();
    } catch (error) {
      setLiked(recipe.isBookmarked);
      throw error;
    }
  },

  addCustomRecipe: async (input) => {
    const recipe = await recipeService.create(input);
    set((state) => ({ recipes: [recipe, ...state.recipes] }));
    return recipe;
  },

  deleteCustomRecipe: async (recipeId) => {
    await recipeService.remove(recipeId);
    set((state) => ({ recipes: state.recipes.filter((r) => r.id !== recipeId) }));
  },

  getRecipeById: (id) => get().recipes.find((r) => r.id === id),
  clear: () => set(initialState),
}));
