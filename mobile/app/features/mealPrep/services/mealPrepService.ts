import { apiRequest } from '@/app/shared/services/apiClient';
import type { MealPrepPlan, PrepStatus } from '../types/mealPrep';

/** Meal Prep Service layer: talks to api/src/modules/mealPrep. */
export const mealPrepService = {
  getWeek: (weekStart: string) =>
    apiRequest<MealPrepPlan>({ method: 'GET', url: '/meal-prep', params: { weekStart } }),

  updateDish: (id: string, data: { prepStatus?: PrepStatus; assigneeId?: string | null }) =>
    apiRequest<void>({ method: 'PATCH', url: `/meal-prep/dishes/${id}`, data }),

  setShoppingCheck: (weekStart: string, key: string, checked: boolean) =>
    apiRequest<void>({ method: 'PUT', url: '/meal-prep/shopping', data: { weekStart, key, checked } }),
};
