import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { ApiError } from '@/app/shared/services/apiClient';
import { useBookmarkStore } from '../../bookmarks/store/bookmarkStore';
import { recipeService } from '../services/recipeService';
import { useRecipeStore } from '../store/recipeStore';
import { validateRecipeInput } from '../validators/recipeValidators';
import type { Recipe } from '../types/recipes';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('../services/recipeService', () => ({
  recipeService: { list: jest.fn(), create: jest.fn(), remove: jest.fn(), setLiked: jest.fn() },
}));

const service = jest.mocked(recipeService);
const store = () => useRecipeStore.getState();

const recipe: Recipe = {
  id: 'r1',
  title: 'Lemon Herb Chicken',
  category: 'high_protein',
  prepTimeMinutes: 20,
  servings: 4,
  difficulty: 'Easy',
  imageUrl: 'https://example.com/chicken.jpg',
  isBookmarked: false,
  ingredients: [{ id: 'i1', name: 'Chicken breast' }],
  steps: [{ stepNumber: 1, instruction: 'Grill chicken.' }],
  createdAt: '2026-11-01T12:00:00.000Z',
};

describe('recipeStore', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    store().clear();
    useBookmarkStore.setState({ loadBookmarks: jest.fn().mockResolvedValue(undefined) });
  });

  it('loads recipes from the API, with no sample data', async () => {
    expect(store().recipes).toEqual([]);
    service.list.mockResolvedValue([recipe]);
    await store().loadRecipes();
    expect(store()).toMatchObject({ recipes: [recipe], isLoading: false });
  });

  it('reports a failed load', async () => {
    service.list.mockRejectedValue(new ApiError('Can’t reach PrepPros.'));
    await store().loadRecipes();
    expect(store()).toMatchObject({ isLoading: false, loadError: 'Can’t reach PrepPros.' });
  });

  it('liking a recipe saves it and refreshes bookmarks, so it shows up there', async () => {
    useRecipeStore.setState({ recipes: [recipe] });
    service.setLiked.mockResolvedValue(undefined);

    await store().toggleBookmark('r1');

    expect(service.setLiked).toHaveBeenCalledWith('r1', true);
    expect(store().recipes[0].isBookmarked).toBe(true);
    expect(useBookmarkStore.getState().loadBookmarks).toHaveBeenCalled();
  });

  it('undoes the like if saving fails', async () => {
    useRecipeStore.setState({ recipes: [recipe] });
    service.setLiked.mockRejectedValue(new ApiError('Can’t reach PrepPros.'));

    await expect(store().toggleBookmark('r1')).rejects.toThrow();

    expect(store().recipes[0].isBookmarked).toBe(false);
  });

  it('adds and deletes custom recipes through the API', async () => {
    service.create.mockResolvedValue({ ...recipe, id: 'mine', isCustom: true });
    await store().addCustomRecipe({
      title: 'Mine',
      category: 'snacks',
      prepTimeMinutes: 5,
      servings: 1,
      ingredientsText: 'Egg',
      instructionsText: 'Boil it',
    });
    expect(store().recipes.map((r) => r.id)).toEqual(['mine']);

    service.remove.mockResolvedValue();
    await store().deleteCustomRecipe('mine');
    expect(store().recipes).toEqual([]);
  });

  it('validates new recipes', () => {
    const result = validateRecipeInput({
      title: 'A',
      category: 'snacks',
      prepTimeMinutes: 5,
      servings: 1,
      ingredientsText: 'Egg',
      instructionsText: 'Boil the egg',
    });
    expect(result.error).toBeTruthy();
  });
});
