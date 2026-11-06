import React, { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { HouseholdPeopleView } from '../components/HouseholdPeopleView';
import { HouseholdSetupCard } from '../components/HouseholdSetupCard';
import { useHouseholdStore } from '../store/householdStore';

/** The people in the person's household, or the way to start or join one. */
export default function HouseholdScreen() {
  const household = useHouseholdStore((state) => state.household);
  const load = useHouseholdStore((state) => state.load);

  // Someone may have joined since this was last open
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return household ? <HouseholdPeopleView household={household} /> : <HouseholdSetupCard />;
}
