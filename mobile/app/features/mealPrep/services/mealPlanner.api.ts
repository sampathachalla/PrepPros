import { apiRequest } from '@/app/shared/services/apiClient';
import type {
  BulkAssignInput,
  BulkAssignResult,
  CatalogDish,
  DishCatalogFilter,
  MealCategory,
  ProposalDishItem,
  PublishWeekResult,
  SaveDishSelectionsInput,
  SetSlotChoiceInput,
  SubmissionStatus,
  UpdateSlotPoliciesInput,
  WeekPlanResponse,
} from '../types/mealPlanner.types';

export const mealPlannerApi = {
  getCatalogDishes: (params: { weekStart: string; filter?: DishCatalogFilter; q?: string }) =>
    apiRequest<{ weekStart: string; dishes: CatalogDish[] }>({
      method: 'GET',
      url: '/meal-planner/dishes',
      params,
    }),

  getWeekPlan: (weekStart: string) =>
    apiRequest<WeekPlanResponse>({
      method: 'GET',
      url: `/meal-planner/weeks/${weekStart}`,
    }),

  saveDishSelections: (weekStart: string, data: SaveDishSelectionsInput) =>
    apiRequest<WeekPlanResponse>({
      method: 'POST',
      url: `/meal-planner/weeks/${weekStart}/dish-selections`,
      data,
    }),

  setSlotChoice: (date: string, meal: MealCategory, data: SetSlotChoiceInput) =>
    apiRequest<WeekPlanResponse>({
      method: 'PUT',
      url: `/meal-planner/slots/${date}/${meal}/choice`,
      data,
    }),

  submitWeeklyPlan: (weekStart: string) =>
    apiRequest<{ weekStart: string; status: SubmissionStatus; submittedAt: string }>({
      method: 'POST',
      url: `/meal-planner/weeks/${weekStart}/submit`,
    }),

  updateSlotPolicies: (weekStart: string, data: UpdateSlotPoliciesInput) =>
    apiRequest<WeekPlanResponse>({
      method: 'PUT',
      url: `/meal-planner/weeks/${weekStart}/slot-policies`,
      data,
    }),

  bulkAssignDraft: (weekStart: string, data: BulkAssignInput) =>
    apiRequest<BulkAssignResult>({
      method: 'POST',
      url: `/meal-planner/weeks/${weekStart}/bulk-assign`,
      data,
    }),

  updateSlotDraft: (
    date: string,
    meal: MealCategory,
    data: { dishes: ProposalDishItem[]; sourceNote?: string | null },
  ) =>
    apiRequest<WeekPlanResponse>({
      method: 'PUT',
      url: `/meal-planner/slots/${date}/${meal}/draft`,
      data,
    }),

  publishWeeklyMenu: (weekStart: string, allowIncomplete = false) =>
    apiRequest<PublishWeekResult>({
      method: 'POST',
      url: `/meal-planner/weeks/${weekStart}/publish`,
      data: { allowIncomplete },
    }),
};
