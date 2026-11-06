import { create } from 'zustand';
import { ApiError } from '@/app/shared/services/apiClient';
import { mealPrepService } from '../services/mealPrepService';
import type { MealPrepPlan, PrepDish, PrepStatus } from '../types/mealPrep';

interface MealPrepState {
  plan: MealPrepPlan | null;
  isLoading: boolean;
  loadError: string | null;

  loadWeek: (weekStart: string) => Promise<void>;
  setPrepStatus: (dishId: string, prepStatus: PrepStatus) => Promise<void>;
  assignCook: (dishId: string, assigneeId: string | null) => Promise<void>;
  toggleShoppingItem: (key: string) => Promise<void>;
  clear: () => void;
}

const initialState = { plan: null, isLoading: true, loadError: null };

/** Only the newest load may apply, so moving between weeks can't show the wrong one. */
let latestLoad = 0;

export const useMealPrepStore = create<MealPrepState>()((set, get) => {
  /** Shows a change at once and puts it back if the server refuses. */
  const optimistic = async (update: (plan: MealPrepPlan) => MealPrepPlan, save: Promise<void>) => {
    const before = get().plan;
    if (before) set({ plan: update(before) });
    try {
      await save;
    } catch (error) {
      set({ plan: before });
      throw error;
    }
  };

  const updateDish = (dishId: string, changes: Partial<PrepDish>) => (plan: MealPrepPlan) => ({
    ...plan,
    dishes: plan.dishes.map((dish) => (dish.id === dishId ? { ...dish, ...changes } : dish)),
  });

  return {
    ...initialState,

    loadWeek: async (weekStart) => {
      const load = ++latestLoad;
      try {
        const plan = await mealPrepService.getWeek(weekStart);
        if (load === latestLoad) set({ plan, isLoading: false, loadError: null });
      } catch (error) {
        if (load !== latestLoad) return;
        set({ isLoading: false, loadError: error instanceof ApiError ? error.message : 'Could not load meal prep.' });
      }
    },

    setPrepStatus: (dishId, prepStatus) =>
      optimistic(updateDish(dishId, { prepStatus }), mealPrepService.updateDish(dishId, { prepStatus })),

    assignCook: (dishId, assigneeId) =>
      optimistic(
        updateDish(dishId, { assigneeId: assigneeId ?? undefined }),
        mealPrepService.updateDish(dishId, { assigneeId }),
      ),

    toggleShoppingItem: async (key) => {
      const plan = get().plan;
      const item = plan?.shopping.find((entry) => entry.key === key);
      if (!plan || !item) return;
      await optimistic(
        (current) => ({
          ...current,
          shopping: current.shopping.map((entry) => (entry.key === key ? { ...entry, checked: !item.checked } : entry)),
        }),
        mealPrepService.setShoppingCheck(plan.weekStart, key, !item.checked),
      );
    },

    clear: () => set(initialState),
  };
});
