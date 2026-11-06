import { useEffect, useState, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { ApiError } from '@/app/shared/services/apiClient';
import { useRecipeStore } from '../store/recipeStore';
import { useCalendarStore } from '../../calendar/store/calendarStore';
import type { MealCategory } from '../../calendar/types/calendar';
import type { CreateRecipeInput, Recipe, RecipeCategory } from '../types/recipes';
import { validateRecipeInput } from '../validators/recipeValidators';

const errorMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';

export function useRecipes() {
  const recipes = useRecipeStore((s) => s.recipes);
  const isLoading = useRecipeStore((s) => s.isLoading);
  const loadError = useRecipeStore((s) => s.loadError);
  const loadRecipes = useRecipeStore((s) => s.loadRecipes);
  const toggleBookmarkInStore = useRecipeStore((s) => s.toggleBookmark);
  const addCustomRecipeToStore = useRecipeStore((s) => s.addCustomRecipe);
  const deleteCustomRecipeInStore = useRecipeStore((s) => s.deleteCustomRecipe);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory>('all');

  // Modal States
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [isCreateVisible, setIsCreateVisible] = useState(false);
  const [isAddToCalendarVisible, setIsAddToCalendarVisible] = useState(false);
  const [recipeToSchedule, setRecipeToSchedule] = useState<Recipe | null>(null);

  useEffect(() => {
    void loadRecipes();
  }, [loadRecipes]);

  // Filtered recipes
  const filteredRecipes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return recipes.filter((recipe) => {
      // Category filter
      const matchesCategory =
        selectedCategory === 'all' || recipe.category === selectedCategory;

      if (!matchesCategory) return false;

      // Search query filter (matches title or any ingredient name)
      if (!query) return true;

      const titleMatches = recipe.title.toLowerCase().includes(query);
      const ingredientMatches = recipe.ingredients.some((ing) =>
        ing.name.toLowerCase().includes(query),
      );

      return titleMatches || ingredientMatches;
    });
  }, [recipes, searchQuery, selectedCategory]);

  const openDetail = useCallback((recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setIsDetailVisible(true);
  }, []);

  const closeDetail = useCallback(() => {
    setIsDetailVisible(false);
    setSelectedRecipe(null);
  }, []);

  const openCreate = useCallback(() => {
    setIsCreateVisible(true);
  }, []);

  const closeCreate = useCallback(() => {
    setIsCreateVisible(false);
  }, []);

  const openAddToCalendar = useCallback((recipe: Recipe) => {
    setRecipeToSchedule(recipe);
    setIsAddToCalendarVisible(true);
  }, []);

  const closeAddToCalendar = useCallback(() => {
    setIsAddToCalendarVisible(false);
    setRecipeToSchedule(null);
  }, []);

  const handleToggleBookmark = useCallback(
    (recipeId: string) => {
      toggleBookmarkInStore(recipeId).catch((error) => Alert.alert('Could not save this recipe', errorMessage(error)));
      // Update local selectedRecipe bookmark state if currently open in detail
      setSelectedRecipe((curr) =>
        curr && curr.id === recipeId ? { ...curr, isBookmarked: !curr.isBookmarked } : curr,
      );
    },
    [toggleBookmarkInStore],
  );

  const handleCreateRecipe = useCallback(
    async (input: CreateRecipeInput): Promise<{ success: boolean; error?: string }> => {
      const validation = validateRecipeInput(input);
      if (validation.error || !validation.data) {
        return { success: false, error: validation.error ?? 'Invalid recipe details' };
      }

      try {
        await addCustomRecipeToStore(validation.data);
      } catch (error) {
        return { success: false, error: errorMessage(error) };
      }
      closeCreate();
      return { success: true };
    },
    [addCustomRecipeToStore, closeCreate],
  );

  const handleScheduleToCalendar = useCallback(
    async (date: string, category: MealCategory) => {
      if (!recipeToSchedule) return;
      try {
        await useCalendarStore.getState().addDish({ date, category, recipeId: recipeToSchedule.id });
        closeAddToCalendar();
      } catch (error) {
        Alert.alert('Could not add to the calendar', errorMessage(error));
      }
    },
    [recipeToSchedule, closeAddToCalendar],
  );

  return {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    filteredRecipes,
    isLoading,
    loadError,
    totalCount: recipes.length,
    selectedRecipe,
    recipeToSchedule,
    isDetailVisible,
    isCreateVisible,
    isAddToCalendarVisible,
    openDetail,
    closeDetail,
    openCreate,
    closeCreate,
    openAddToCalendar,
    closeAddToCalendar,
    handleToggleBookmark,
    handleCreateRecipe,
    handleScheduleToCalendar,
    deleteCustomRecipe: deleteCustomRecipeInStore,
  };
}
