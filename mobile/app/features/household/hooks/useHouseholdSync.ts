import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useRouter } from 'expo-router';
import { useHouseholdStore } from '../store/householdStore';

/**
 * Keeps the household current for every tab, including who has joined since the app last opened, and
 * takes someone who followed an invite link to the join form, filled in.
 */
export function useHouseholdSync() {
  const load = useHouseholdStore((state) => state.load);
  const router = useRouter();
  const hasPendingInvite = useHouseholdStore(
    (state) => state.pendingInviteCode !== null && state.household === null && !state.isLoading && !state.loadError,
  );

  useEffect(() => {
    void load();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') void load();
    });
    return () => subscription.remove();
  }, [load]);

  useEffect(() => {
    if (hasPendingInvite) router.navigate({ pathname: '/(tabs)/profile', params: { view: 'people' } });
  }, [hasPendingInvite, router]);
}
