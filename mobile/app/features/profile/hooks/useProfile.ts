import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { logout } from '@/app/auth/services/authService';
import { getAuthUser } from '@/app/auth/store/authSession';
import type { AuthUser } from '@/app/auth/types/auth';
import { clearSessionData } from '@/app/shared/services/sessionData';
import { useThemeContext } from '@/context/ThemeContext';
import { useHouseholdStore } from '../../household/store/householdStore';
import { PROFILE_COPY } from '../constants/profile';
import { profileService, toProfileStats } from '../services/profileService';
import { useProfileStore } from '../store/profileStore';

export function useProfile() {
  const router = useRouter();
  const { theme, toggleTheme } = useThemeContext();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const mealReminders = useProfileStore((s) => s.mealReminders);
  const showPrepTips = useProfileStore((s) => s.showPrepTips);
  const setMealReminders = useProfileStore((s) => s.setMealReminders);
  const setShowPrepTips = useProfileStore((s) => s.setShowPrepTips);

  const household = useHouseholdStore((s) => s.household);
  const [stats, setStats] = useState(() => toProfileStats({ mealsPlanned: 0, recipesSaved: 0, bookmarks: 0 }));

  useEffect(() => {
    let mounted = true;
    (async () => {
      const stored = await getAuthUser();
      if (mounted) {
        setUser(stored);
        setIsLoadingUser(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      profileService
        .get()
        .then((profile) => setStats(toProfileStats(profile.stats)))
        .catch(() => undefined); // the page still works; stats catch up on the next visit
    }, []),
  );

  const saveProfile = useCallback(async (changes: { displayName: string; avatarColor?: string }) => {
    await profileService.update(changes);
    setUser(await getAuthUser());
    await useHouseholdStore.getState().load();
  }, []);

  const isDarkMode = theme === 'dark';

  const handleLogout = useCallback(() => {
    Alert.alert('Log out', PROFILE_COPY.logoutConfirm, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: PROFILE_COPY.logout,
        style: 'destructive',
        onPress: async () => {
          await logout();
          clearSessionData();
          router.replace('/auth/login');
        },
      },
    ]);
  }, [router]);

  const showAbout = useCallback(() => {
    Alert.alert('PrepPros', PROFILE_COPY.helpMessage);
  }, []);

  return {
    user,
    isLoadingUser,
    household,
    saveProfile,
    stats,
    isDarkMode,
    mealReminders,
    showPrepTips,
    toggleDarkMode: toggleTheme,
    setMealReminders,
    setShowPrepTips,
    handleLogout,
    showAbout,
  };
}
