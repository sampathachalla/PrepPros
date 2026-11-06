import { create } from 'zustand';
import { ApiError } from '@/app/shared/services/apiClient';
import { householdService } from '../services/householdService';
import type { Household } from '../types/household';

interface HouseholdState {
  household: Household | null;
  isLoading: boolean;
  loadError: string | null;
  /** From an invite link opened before the person could join. */
  pendingInviteCode: string | null;

  load: () => Promise<void>;
  create: (name: string) => Promise<void>;
  join: (code: string) => Promise<void>;
  rename: (name: string) => Promise<void>;
  resetInvite: () => Promise<void>;
  addMember: (email: string) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  makeAdmin: (userId: string) => Promise<void>;
  leave: () => Promise<void>;
  setPendingInviteCode: (code: string | null) => void;
  clear: () => void;
}

const initialState = { household: null, isLoading: true, loadError: null, pendingInviteCode: null };

export const useHouseholdStore = create<HouseholdState>()((set) => {
  /** Runs a change and shows the household the server sends back. */
  const apply = async (change: Promise<Household | null>) => {
    set({ household: await change, loadError: null, isLoading: false });
  };

  return {
    ...initialState,

    load: async () => {
      try {
        set({ household: await householdService.get(), isLoading: false, loadError: null });
      } catch (error) {
        set({ isLoading: false, loadError: error instanceof ApiError ? error.message : 'Could not load your household.' });
      }
    },
    create: (name) => apply(householdService.create(name)),
    join: async (code) => {
      await apply(householdService.join(code));
      set({ pendingInviteCode: null });
    },
    rename: (name) => apply(householdService.rename(name)),
    resetInvite: () => apply(householdService.resetInvite()),
    addMember: (email) => apply(householdService.addMember(email)),
    removeMember: (userId) => apply(householdService.removeMember(userId)),
    makeAdmin: (userId) => apply(householdService.makeAdmin(userId)),
    leave: async () => {
      await householdService.leave();
      set({ household: null });
    },
    setPendingInviteCode: (pendingInviteCode) => set({ pendingInviteCode }),
    clear: () => set(initialState),
  };
});

export const selectIsHouseholdAdmin = (state: HouseholdState) => state.household?.myRole === 'admin';
