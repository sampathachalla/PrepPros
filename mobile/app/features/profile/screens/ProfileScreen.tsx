import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { User, Users } from 'lucide-react-native';
import { useScreenHeader } from '@/app/shared';
import { TabSwitch } from '@/app/shared/components/ui/TabSwitch';
import HouseholdScreen from '../../household/screens/HouseholdScreen';
import { ProfileDetailsView } from '../components/ProfileDetailsView';
import { useProfileColors } from '../hooks/useProfileColors';

type ProfileView = 'profile' | 'people';

const TABS = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'people', label: 'People', icon: Users },
] as const;

/** The person's own account, and the household they share meals with. */
export default function ProfileScreen() {
  const colors = useProfileColors();
  const router = useRouter();
  const { view } = useLocalSearchParams<{ view?: ProfileView }>();
  const selected: ProfileView = view === 'people' ? 'people' : 'profile';
  useScreenHeader({ title: selected === 'profile' ? 'Profile' : 'People' });

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <TabSwitch tabs={TABS} selected={selected} onSelect={(next) => router.setParams({ view: next })} />
      <View style={styles.content}>{selected === 'profile' ? <ProfileDetailsView /> : <HouseholdScreen />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1 },
});
