import { useEffect } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useHouseholdStore } from '@/app/features/household/store/householdStore';

/** Opened by an invite link (preppros://join/CODE): keeps the code so the join form is filled in. */
export default function JoinHouseholdRoute() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const setPendingInviteCode = useHouseholdStore((state) => state.setPendingInviteCode);

  useEffect(() => {
    if (code) setPendingInviteCode(code);
  }, [code, setPendingInviteCode]);

  return <Redirect href="/" />;
}
