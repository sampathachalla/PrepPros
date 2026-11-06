import { create } from 'zustand';
import { ApiError } from '@/app/shared/services/apiClient';
import { calendarService } from '../services/calendarService';
import type {
  AddDishPayload,
  CalendarResponse,
  CategoryDishes,
  MealDayState,
  ScheduledDish,
} from '../types/calendar';
import { addDays, getTodayDateKey } from '../utils/dateUtils';

export interface CalendarState {
  selectedDate: string;
  dishesByDate: Record<string, CategoryDishes>;
  dayStates: Record<string, MealDayState>;
  /** Days the server has answered for, so an empty one means empty rather than not loaded yet. */
  loadedDates: Record<string, true>;
  /** The days on screen; changes are followed by reloading them. */
  range: { from: string; to: string } | null;
  /** Server time minus phone time, so countdowns ignore a wrong phone clock. */
  clockOffsetMs: number;
  isLoading: boolean;
  loadError: string | null;

  setSelectedDate: (date: string) => void;
  loadRange: (from: string, to: string) => Promise<void>;
  reload: () => Promise<void>;
  addDish: (payload: AddDishPayload) => Promise<void>;
  removeDish: (id: string) => Promise<void>;
  /** Chooses a dish for the person, replacing their choice for that meal. */
  acceptDish: (dish: ScheduledDish, userId: string) => Promise<void>;
  withdrawDish: (dish: ScheduledDish, userId: string) => Promise<void>;
  decideSuggestion: (id: string, approve: boolean) => Promise<void>;
  startTimer: (dates: string[], durationMinutes: number) => Promise<void>;
  fixDay: (date: string) => Promise<void>;
  /** Fixes several days at once, without a timer. */
  fixDays: (dates: string[]) => Promise<void>;
  clear: () => void;
}

export const EMPTY_CATEGORY_DISHES: CategoryDishes = { breakfast: [], lunch: [], dinner: [], snacks: [] };

const initialState = {
  selectedDate: getTodayDateKey(),
  dishesByDate: {},
  dayStates: {},
  loadedDates: {},
  range: null,
  clockOffsetMs: 0,
  isLoading: true,
  loadError: null,
};

function datesBetween(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) dates.push(date);
  return dates;
}

/** Replaces the loaded days, so a dish removed by someone else disappears here too. */
export function mergeRange(
  state: Pick<CalendarState, 'dishesByDate' | 'dayStates'>,
  from: string,
  to: string,
  response: CalendarResponse,
) {
  const dishesByDate = { ...state.dishesByDate };
  const dayStates = { ...state.dayStates };
  for (const date of datesBetween(from, to)) {
    delete dishesByDate[date];
    delete dayStates[date];
  }
  for (const day of response.days) dayStates[day.date] = day;
  for (const dish of response.dishes) {
    const day = dishesByDate[dish.date] ?? { breakfast: [], lunch: [], dinner: [], snacks: [] };
    dishesByDate[dish.date] = { ...day, [dish.category]: [...day[dish.category], dish] };
  }
  return { dishesByDate, dayStates };
}

/** The person's choice moved to `chosen` (or cleared), shown right away while the server catches up. */
function withChoice(day: CategoryDishes, dish: ScheduledDish, userId: string, chosen: boolean): CategoryDishes {
  return {
    ...day,
    [dish.category]: day[dish.category].map((other) => {
      const others = other.memberIds.filter((id) => id !== userId);
      return { ...other, memberIds: chosen && other.id === dish.id ? [...others, userId] : others };
    }),
  };
}

/** Only the newest load may apply, so a slow response can't overwrite a newer one. */
let latestLoad = 0;

export const useCalendarStore = create<CalendarState>()((set, get) => {
  /** Runs a change, then shows what the server now has, whether it worked or not. */
  const change = async (task: Promise<unknown>) => {
    try {
      await task;
    } finally {
      await get().reload();
    }
  };

  const setChoice = (dish: ScheduledDish, userId: string, chosen: boolean) =>
    set((state) => {
      const day = state.dishesByDate[dish.date];
      return day ? { dishesByDate: { ...state.dishesByDate, [dish.date]: withChoice(day, dish, userId, chosen) } } : state;
    });

  return {
    ...initialState,

    setSelectedDate: (selectedDate) => set({ selectedDate }),

    loadRange: async (from, to) => {
      const load = ++latestLoad;
      set({ range: { from, to } });
      try {
        const response = await calendarService.getRange(from, to);
        if (load !== latestLoad) return;
        set((state) => ({
          ...mergeRange(state, from, to, response),
          loadedDates: { ...state.loadedDates, ...Object.fromEntries(datesBetween(from, to).map((date) => [date, true])) },
          clockOffsetMs: new Date(response.serverTime).getTime() - Date.now(),
          isLoading: false,
          loadError: null,
        }));
      } catch (error) {
        if (load !== latestLoad) return;
        set({ isLoading: false, loadError: error instanceof ApiError ? error.message : 'Could not load the calendar.' });
      }
    },

    reload: async () => {
      const { range } = get();
      if (range) await get().loadRange(range.from, range.to);
    },

    addDish: (payload) => change(calendarService.addDish(payload)),
    removeDish: (id) => change(calendarService.removeDish(id)),

    acceptDish: (dish, userId) => {
      setChoice(dish, userId, true);
      return change(calendarService.accept(dish.id));
    },

    withdrawDish: (dish, userId) => {
      setChoice(dish, userId, false);
      return change(calendarService.withdraw(dish.id));
    },

    decideSuggestion: (id, approve) => change(calendarService.decide(id, approve)),
    startTimer: (dates, durationMinutes) => change(calendarService.startTimer(dates, durationMinutes)),
    fixDay: (date) => change(calendarService.fixDay(date)),
    fixDays: (dates) => change(Promise.all(dates.map(calendarService.fixDay))),
    clear: () => set({ ...initialState, selectedDate: getTodayDateKey() }),
  };
});
