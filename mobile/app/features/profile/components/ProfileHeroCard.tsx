import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChefHat, Pencil } from 'lucide-react-native';
import type { AuthUser } from '@/app/auth/types/auth';
import type { HouseholdRole } from '../../household/types/household';
import { PROFILE_COPY } from '../constants/profile';
import type { ProfileColors } from '../hooks/useProfileColors';

interface ProfileHeroCardProps {
  user: AuthUser | null;
  isLoading: boolean;
  colors: ProfileColors;
  householdRole?: HouseholdRole;
  onEdit: () => void;
}

function getInitials(username?: string): string {
  if (!username) return '?';
  const parts = username.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return username.slice(0, 2).toUpperCase();
}

export function ProfileHeroCard({ user, isLoading, householdRole, colors, onEdit }: ProfileHeroCardProps) {
  const displayName = user?.displayName ?? user?.username ?? (isLoading ? 'Loading…' : 'Guest');
  const roleColor = householdRole === 'admin' ? colors.badgeTrainer : colors.badgeMember;
  const roleLabel = householdRole === 'admin' ? PROFILE_COPY.roleAdmin : PROFILE_COPY.roleMember;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.avatar, { backgroundColor: user?.avatarColor ?? `${colors.secondary}55` }]}>
        <Text style={[styles.avatarText, { color: user?.avatarColor ? '#111111' : colors.text }]}>
          {getInitials(user?.displayName ?? user?.username)}
        </Text>
      </View>

      <View style={styles.textBlock}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={[styles.tagline, { color: colors.textMuted }]}>{PROFILE_COPY.tagline}</Text>

        {householdRole ? (
          <View style={[styles.roleBadge, { backgroundColor: `${roleColor}44` }]}>
            <ChefHat size={14} color={roleColor} />
            <Text style={[styles.roleText, { color: roleColor }]}>{roleLabel}</Text>
          </View>
        ) : null}
      </View>

      <TouchableOpacity onPress={onEdit} hitSlop={10} accessibilityLabel="Edit profile" accessibilityRole="button">
        <Pencil size={18} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  tagline: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
