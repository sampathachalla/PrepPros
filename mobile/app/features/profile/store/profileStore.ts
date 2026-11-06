import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PROFILE_PREFERENCES, PROFILE_STORAGE_KEY } from '../constants/profile';
import type { ProfilePreferences } from '../types/profile';

interface ProfileState extends ProfilePreferences {
  setMealReminders: (enabled: boolean) => void;
  setShowPrepTips: (enabled: boolean) => void;
  resetPreferences: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      ...DEFAULT_PROFILE_PREFERENCES,

      setMealReminders: (mealReminders) => set({ mealReminders }),
      setShowPrepTips: (showPrepTips) => set({ showPrepTips }),
      resetPreferences: () => set({ ...DEFAULT_PROFILE_PREFERENCES }),
    }),
    {
      name: PROFILE_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
