import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ApiError } from '@/app/shared/services/apiClient';
import { EditProfileModal } from '../../profile/components/EditProfileModal';
import { useProfileColors } from '../../profile/hooks/useProfileColors';
import { profileService } from '../../profile/services/profileService';
import { useHouseholdColors } from '../hooks/useHouseholdColors';
import { useHouseholdStore } from '../store/householdStore';
import type { Household, HouseholdPerson } from '../types/household';
import { AddMemberForm } from './AddMemberForm';
import { HouseholdInviteCard } from './HouseholdInviteCard';
import { HouseholdMemberRow } from './HouseholdMemberRow';
import { HouseholdNameHeader } from './HouseholdNameHeader';

const showError = (error: unknown) =>
  Alert.alert('That didn’t work', error instanceof ApiError ? error.message : 'Please try again.');

/** The household's name, its people, and the ways to add more. */
export function HouseholdPeopleView({ household }: { household: Household }) {
  const colors = useHouseholdColors();
  const { rename, addMember, resetInvite, removeMember, makeAdmin, leave, load } = useHouseholdStore.getState();
  const profileColors = useProfileColors();
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const isAdmin = household.myRole === 'admin';
  const me = household.members.find((member) => member.id === household.myId);

  const saveMyProfile = async (changes: { displayName: string; avatarColor?: string }) => {
    await profileService.update(changes);
    await load();
  };

  const confirmReset = () =>
    Alert.alert('Reset invite link?', 'Links you already shared will stop working.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => resetInvite().catch(showError) },
    ]);

  const manageMember = (member: HouseholdPerson) =>
    Alert.alert(member.name, undefined, [
      {
        text: 'Make admin',
        onPress: () =>
          Alert.alert(`Make ${member.name} the admin?`, 'You’ll become a member. They’ll set the plan from now on.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Make admin', onPress: () => makeAdmin(member.id).catch(showError) },
          ]),
      },
      { text: 'Remove from household', style: 'destructive', onPress: () => removeMember(member.id).catch(showError) },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const confirmLeave = () => {
    const isLast = household.members.length === 1;
    Alert.alert(
      isLast ? 'Close this household?' : 'Leave this household?',
      isLast ? 'You’re the only one here, so its meal plans will be deleted.' : 'Your answers for upcoming meals will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: isLast ? 'Close' : 'Leave', style: 'destructive', onPress: () => leave().catch(showError) },
      ],
    );
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <HouseholdNameHeader
          name={household.name}
          memberCount={household.members.length}
          maxMembers={household.maxMembers}
          canRename={isAdmin}
          onRename={rename}
        />

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.textMuted }]}>People</Text>
          {household.members.map((member) => (
            <HouseholdMemberRow
              key={member.id}
              member={member}
              isYou={member.id === household.myId}
              onEdit={
                member.id === household.myId
                  ? () => setIsEditingProfile(true)
                  : isAdmin
                    ? manageMember
                    : undefined
              }
            />
          ))}
          {isAdmin ? (
            <AddMemberForm isFull={household.members.length >= household.maxMembers} onAdd={addMember} />
          ) : null}
        </View>

        <HouseholdInviteCard household={household} canReset={isAdmin} onReset={confirmReset} />

        <TouchableOpacity onPress={confirmLeave} style={styles.leaveButton} accessibilityRole="button">
          <Text style={[styles.leaveText, { color: colors.error }]}>
            {household.members.length === 1 ? 'Close household' : 'Leave household'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {isEditingProfile && me ? (
        <EditProfileModal
          visible
          initialName={me.name}
          initialColor={me.color}
          colors={profileColors}
          onClose={() => setIsEditingProfile(false)}
          onSave={saveMyProfile}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 14 },
  cardLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  leaveButton: { alignItems: 'center', paddingVertical: 12 },
  leaveText: { fontSize: 15, fontWeight: '700' },
});
