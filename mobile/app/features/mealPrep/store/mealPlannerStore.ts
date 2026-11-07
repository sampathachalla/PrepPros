import { create } from 'zustand';
import { ApiError } from '@/app/shared/services/apiClient';
import { useCalendarStore } from '../../calendar/store/calendarStore';
import { addDays } from '../../calendar/utils/dateUtils';
import { mealPlannerApi } from '../services/mealPlanner.api';
import type {
  BulkAssignInput,
  BulkAssignResult,
  CatalogDish,
  DishCatalogFilter,
  MealCategory,
  MealPlannerSubScreen,
  MemberSubmissionSummary,
  PlannerSlotViewModel,
  ProposalDishItem,
  PublishWeekResult,
  SaveDishSelectionsInput,
  SetSlotChoiceInput,
  SlotCoord,
  SubmissionStatus,
  UpdateSlotPoliciesInput,
  WeeklyPlanMeta,
  WeekPlanResponse,
} from '../types/mealPlanner.types';
import { getSundayWeekStart, toggleSlotInList, toSlotKey } from '../utils/mealPlanner.utils';

export interface MealPlannerState {
  weekStart: string;
  activeScreen: MealPlannerSubScreen;
  activeDish: CatalogDish | null;
  activeSlot: SlotCoord | null;

  catalogFilter: DishCatalogFilter;
  searchQuery: string;
  catalogDishes: CatalogDish[];
  isCatalogLoading: boolean;
  catalogError: string | null;

  weekMeta: WeeklyPlanMeta | null;
  mySubmission: { status: SubmissionStatus; submittedAt?: string | null };
  memberSubmissions: MemberSubmissionSummary[];
  slotsByKey: Record<string, PlannerSlotViewModel>;
  isWeekLoading: boolean;
  isSaving: boolean;
  weekError: string | null;

  /**
   * Buffered local slot selections keyed by `${weekStart}::${dishKey}` so navigating
   * from Page 2 (DishWeeklyPickerScreen) to Page 3 (MealSlotDetailsScreen) and back
   * never loses unsaved slot selections.
   */
  bufferedDishSlots: Record<string, SlotCoord[]>;

  setWeekStart: (weekStart: string) => void;
  shiftWeek: (deltaWeeks: number) => void;
  navigateTo: (screen: MealPlannerSubScreen, opts?: { dish?: CatalogDish; slot?: SlotCoord }) => void;

  setCatalogFilter: (filter: DishCatalogFilter) => void;
  setSearchQuery: (query: string) => void;
  loadCatalog: (weekStart?: string) => Promise<void>;
  loadWeekPlan: (weekStart?: string) => Promise<void>;
  refreshAll: () => Promise<void>;

  getBufferedSlots: (weekStart: string, dishKey: string) => SlotCoord[];
  setBufferedSlots: (weekStart: string, dishKey: string, slots: SlotCoord[]) => void;
  toggleBufferedSlot: (weekStart: string, dishKey: string, slot: SlotCoord) => void;
  clearBufferedSlots: (weekStart: string, dishKey: string) => void;

  saveDishSelections: (input: SaveDishSelectionsInput) => Promise<void>;
  setSlotChoice: (date: string, meal: MealCategory, input: SetSlotChoiceInput) => Promise<void>;
  submitWeeklyPlan: () => Promise<void>;
  updateSlotPolicies: (input: UpdateSlotPoliciesInput) => Promise<void>;
  bulkAssignDraft: (input: BulkAssignInput) => Promise<BulkAssignResult>;
  updateSlotDraft: (date: string, meal: MealCategory, dishes: ProposalDishItem[], sourceNote?: string | null) => Promise<void>;
  publishWeeklyMenu: (allowIncomplete?: boolean) => Promise<PublishWeekResult>;
}

function bufferKey(weekStart: string, dishKey: string): string {
  return `${weekStart}::${dishKey}`;
}

function applyWeekResponse(response: WeekPlanResponse) {
  const slotsByKey: Record<string, PlannerSlotViewModel> = {};
  for (const slot of response.slots) {
    slotsByKey[toSlotKey({ date: slot.date, meal: slot.meal })] = slot;
  }
  return {
    weekMeta: response.week,
    mySubmission: response.mySubmission,
    memberSubmissions: response.memberSubmissions,
    slotsByKey,
    isWeekLoading: false,
    weekError: null,
  };
}

export const useMealPlannerStore = create<MealPlannerState>()((set, get) => ({
  weekStart: getSundayWeekStart(),
  activeScreen: 'library',
  activeDish: null,
  activeSlot: null,

  catalogFilter: 'liked',
  searchQuery: '',
  catalogDishes: [],
  isCatalogLoading: false,
  catalogError: null,

  weekMeta: null,
  mySubmission: { status: 'draft', submittedAt: null },
  memberSubmissions: [],
  slotsByKey: {},
  isWeekLoading: false,
  isSaving: false,
  weekError: null,

  bufferedDishSlots: {},

  setWeekStart: (weekStart) => {
    const sunday = getSundayWeekStart(weekStart);
    set({ weekStart: sunday });
    void get().loadWeekPlan(sunday);
    void get().loadCatalog(sunday);
  },

  shiftWeek: (deltaWeeks) => {
    const next = addDays(get().weekStart, deltaWeeks * 7);
    get().setWeekStart(next);
  },

  navigateTo: (screen, opts) =>
    set((state) => ({
      activeScreen: screen,
      activeDish: opts?.dish !== undefined ? opts.dish : state.activeDish,
      activeSlot: opts?.slot !== undefined ? opts.slot : state.activeSlot,
    })),

  setCatalogFilter: (catalogFilter) => {
    set({ catalogFilter });
  },

  setSearchQuery: (searchQuery) => {
    set({ searchQuery });
  },

  loadCatalog: async (targetWeek) => {
    const weekStart = targetWeek ?? get().weekStart;
    set({ isCatalogLoading: true, catalogError: null });
    try {
      const res = await mealPlannerApi.getCatalogDishes({ weekStart });
      set({ catalogDishes: res.dishes, isCatalogLoading: false, catalogError: null });
    } catch (error) {
      set({
        isCatalogLoading: false,
        catalogError: error instanceof ApiError ? error.message : 'Could not load dishes.',
      });
    }
  },

  loadWeekPlan: async (targetWeek) => {
    const weekStart = targetWeek ?? get().weekStart;
    set({ isWeekLoading: true, weekError: null });
    try {
      const res = await mealPlannerApi.getWeekPlan(weekStart);
      set(applyWeekResponse(res));
    } catch (error) {
      set({
        isWeekLoading: false,
        weekError: error instanceof ApiError ? error.message : 'Could not load weekly plan.',
      });
    }
  },

  refreshAll: async () => {
    const { weekStart } = get();
    await Promise.all([get().loadCatalog(weekStart), get().loadWeekPlan(weekStart)]);
  },

  getBufferedSlots: (weekStart, dishKey) => {
    return get().bufferedDishSlots[bufferKey(weekStart, dishKey)] ?? [];
  },

  setBufferedSlots: (weekStart, dishKey, slots) =>
    set((state) => ({
      bufferedDishSlots: {
        ...state.bufferedDishSlots,
        [bufferKey(weekStart, dishKey)]: slots,
      },
    })),

  toggleBufferedSlot: (weekStart, dishKey, slot) =>
    set((state) => {
      const key = bufferKey(weekStart, dishKey);
      const current = state.bufferedDishSlots[key] ?? [];
      return {
        bufferedDishSlots: {
          ...state.bufferedDishSlots,
          [key]: toggleSlotInList(current, slot),
        },
      };
    }),

  clearBufferedSlots: (weekStart, dishKey) =>
    set((state) => {
      const next = { ...state.bufferedDishSlots };
      delete next[bufferKey(weekStart, dishKey)];
      return { bufferedDishSlots: next };
    }),

  saveDishSelections: async (input) => {
    const { weekStart } = get();
    set({ isSaving: true });
    try {
      const res = await mealPlannerApi.saveDishSelections(weekStart, input);
      set({ ...applyWeekResponse(res), isSaving: false });
      get().clearBufferedSlots(weekStart, input.dish.dishKey);
      void get().loadCatalog(weekStart);
    } catch (error) {
      set({ isSaving: false });
      throw error;
    }
  },

  setSlotChoice: async (date, meal, input) => {
    set({ isSaving: true });
    try {
      const res = await mealPlannerApi.setSlotChoice(date, meal, input);
      set({ ...applyWeekResponse(res), isSaving: false });
    } catch (error) {
      set({ isSaving: false });
      throw error;
    }
  },

  submitWeeklyPlan: async () => {
    const { weekStart } = get();
    set({ isSaving: true });
    try {
      const res = await mealPlannerApi.submitWeeklyPlan(weekStart);
      set((state) => ({
        isSaving: false,
        mySubmission: { status: res.status, submittedAt: res.submittedAt },
        memberSubmissions: state.memberSubmissions.some((m) => m.userId === 'me')
          ? state.memberSubmissions
          : state.memberSubmissions,
      }));
      await get().loadWeekPlan(weekStart);
    } catch (error) {
      set({ isSaving: false });
      throw error;
    }
  },

  updateSlotPolicies: async (input) => {
    const { weekStart } = get();
    set({ isSaving: true });
    try {
      const res = await mealPlannerApi.updateSlotPolicies(weekStart, input);
      set({ ...applyWeekResponse(res), isSaving: false });
    } catch (error) {
      set({ isSaving: false });
      throw error;
    }
  },

  bulkAssignDraft: async (input) => {
    const { weekStart } = get();
    set({ isSaving: true });
    try {
      const result = await mealPlannerApi.bulkAssignDraft(weekStart, input);
      if (!input.dryRun) {
        await get().loadWeekPlan(weekStart);
      }
      set({ isSaving: false });
      return result;
    } catch (error) {
      set({ isSaving: false });
      throw error;
    }
  },

  updateSlotDraft: async (date, meal, dishes, sourceNote) => {
    set({ isSaving: true });
    try {
      const res = await mealPlannerApi.updateSlotDraft(date, meal, { dishes, sourceNote });
      set({ ...applyWeekResponse(res), isSaving: false });
    } catch (error) {
      set({ isSaving: false });
      throw error;
    }
  },

  publishWeeklyMenu: async (allowIncomplete = false) => {
    const { weekStart } = get();
    set({ isSaving: true });
    try {
      const result = await mealPlannerApi.publishWeeklyMenu(weekStart, allowIncomplete);
      await get().loadWeekPlan(weekStart);
      // Synchronize the read-only Published Calendar store immediately
      await useCalendarStore.getState().reload();
      set({ isSaving: false });
      return result;
    } catch (error) {
      set({ isSaving: false });
      throw error;
    }
  },
}));
