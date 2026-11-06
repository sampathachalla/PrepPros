import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useProfile } from '../hooks/useProfile';
import { useProfileColors } from '../hooks/useProfileColors';
import { EditProfileModal } from './EditProfileModal';
import { ProfileHeroCard } from './ProfileHeroCard';
import { ProfileStatsGrid } from './ProfileStatsGrid';
import { ProfileMenuSection } from './ProfileMenuSection';
import { PROFILE_COPY } from '../constants/profile';

/** The person's account: who they are, their numbers, and their settings. */
export function ProfileDetailsView() {
  const colors = useProfileColors();
  const {
    user,
    isLoadingUser,
    household,
    saveProfile,
    stats,
    isDarkMode,
    mealReminders,
    showPrepTips,
    toggleDarkMode,
    setMealReminders,
    setShowPrepTips,
    handleLogout,
    showAbout,
  } = useProfile();
  const [isEditing, setIsEditing] = useState(false);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ProfileHeroCard
          user={user}
          isLoading={isLoadingUser}
          householdRole={household?.myRole}
          colors={colors}
          onEdit={() => setIsEditing(true)}
        />

        <ProfileStatsGrid stats={stats} colors={colors} />

        <ProfileMenuSection
          title={PROFILE_COPY.preferencesTitle}
          colors={colors}
          isDarkMode={isDarkMode}
          mealReminders={mealReminders}
          showPrepTips={showPrepTips}
          onToggleDarkMode={toggleDarkMode}
          onToggleMealReminders={setMealReminders}
          onTogglePrepTips={setShowPrepTips}
          onAbout={showAbout}
        />

        <Text style={[styles.accountLabel, { color: colors.textMuted }]}>
          {PROFILE_COPY.accountTitle}
        </Text>

        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.85}
          style={[styles.logoutButton, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.logoutText, { color: colors.onPrimary }]}>{PROFILE_COPY.logout}</Text>
        </TouchableOpacity>
      </ScrollView>

      {isEditing ? (
        <EditProfileModal
          visible
          initialName={user?.displayName ?? user?.username ?? ''}
          initialColor={user?.avatarColor}
          colors={colors}
          onClose={() => setIsEditing(false)}
          onSave={saveProfile}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  accountLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  logoutButton: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '800',
  },
});
