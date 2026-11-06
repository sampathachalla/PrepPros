import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Calendar, Bookmark, ChefHat } from 'lucide-react-native';
import type { ProfileStat, ProfileStatKey } from '../types/profile';
import type { ProfileColors } from '../hooks/useProfileColors';
import { PROFILE_COPY } from '../constants/profile';

const STAT_ICONS: Record<ProfileStatKey, typeof Calendar> = {
  mealsPlanned: Calendar,
  recipesSaved: ChefHat,
  bookmarks: Bookmark,
};

interface ProfileStatsGridProps {
  stats: ProfileStat[];
  colors: ProfileColors;
}

export function ProfileStatsGrid({ stats, colors }: ProfileStatsGridProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{PROFILE_COPY.statsTitle}</Text>
      <View style={styles.grid}>
        {stats.map((stat) => {
          const Icon = STAT_ICONS[stat.key];
          const tint =
            stat.key === 'recipesSaved'
              ? colors.primary
              : stat.key === 'bookmarks'
                ? colors.secondary
                : colors.primary;

          return (
            <View
              key={stat.key}
              style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.iconWrap, { backgroundColor: `${tint}33` }]}>
                <Icon size={18} color={tint} />
              </View>
              <Text style={[styles.value, { color: colors.text }]}>{stat.value}</Text>
              <Text style={[styles.label, { color: colors.textMuted }]} numberOfLines={2}>
                {stat.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
  },
  label: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
  },
});
