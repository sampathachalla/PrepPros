import { apiRequest } from '@/app/shared/services/apiClient';
import type {
  AddDishPayload,
  CalendarResponse,
  DishOptions,
  MealCategory,
  ScheduledDish,
} from '../types/calendar';

/** Calendar Service layer: talks to api/src/modules/calendar. */
export const calendarService = {
  getRange: (from: string, to: string) =>
    apiRequest<CalendarResponse>({ method: 'GET', url: '/calendar', params: { from, to } }),

  getDishOptions: (meal: MealCategory) =>
    apiRequest<DishOptions>({ method: 'GET', url: '/calendar/dish-options', params: { meal } }),

  addDish: ({ category, ...dish }: AddDishPayload) =>
    apiRequest<ScheduledDish>({ method: 'POST', url: '/calendar/dishes', data: { ...dish, meal: category } }),

  removeDish: (id: string) => apiRequest<void>({ method: 'DELETE', url: `/calendar/dishes/${id}` }),

  accept: (id: string) => apiRequest<ScheduledDish>({ method: 'POST', url: `/calendar/dishes/${id}/accept` }),

  withdraw: (id: string) => apiRequest<ScheduledDish>({ method: 'DELETE', url: `/calendar/dishes/${id}/accept` }),

  decide: (id: string, approve: boolean) =>
    apiRequest<ScheduledDish>({ method: 'POST', url: `/calendar/dishes/${id}/decision`, data: { approve } }),

  startTimer: (dates: string[], durationMinutes: number) =>
    apiRequest<{ votingEndsAt: string }>({ method: 'POST', url: '/calendar/timer', data: { dates, durationMinutes } }),

  fixDay: (date: string) => apiRequest<void>({ method: 'POST', url: `/calendar/days/${date}/fix` }),
};
