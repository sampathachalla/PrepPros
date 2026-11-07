import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, CheckCircle2, CircleDashed, FileEdit, Lock, Unlock } from 'lucide-react-native';
import { useCalendarColors } from '../../calendar/hooks/useCalendarColors';
import type { DraftSlotStatus, SlotPolicyStatus } from '../types/mealPlanner.types';

export interface MealSlotStatusProps {
  policy?: SlotPolicyStatus;
  draftStatus?: DraftSlotStatus;
  compact?: boolean;
}

export function MealSlotStatus({ policy, draftStatus, compact = false }: MealSlotStatusProps) {
  const colors = useCalendarColors();

  if (policy === 'reserved') {
    return (
      <View
        style={[
          styles.badge,
          compact && styles.badgeCompact,
          { backgroundColor: colors.primarySoft, borderColor: colors.primary },
        ]}
      >
        <Lock size={compact ? 10 : 12} color={colors.text} strokeWidth={2.5} />
        <Text style={[styles.label, compact && styles.labelCompact, { color: colors.text }]} numberOfLines={1}>
          {compact ? 'Reserved' : 'Reserved by admin'}
        </Text>
      </View>
    );
  }

  if (draftStatus) {
    const config: Record<
      DraftSlotStatus,
      { label: string; shortLabel: string; bg: string; border: string; text: string; Icon: typeof CheckCircle2 }
    > = {
      empty: {
        label: 'Empty',
        shortLabel: 'Empty',
        bg: colors.inputBackground,
        border: colors.border,
        text: colors.textMuted,
        Icon: CircleDashed,
      },
      draft: {
        label: 'Draft',
        shortLabel: 'Draft',
        bg: colors.secondarySoft,
        border: colors.secondary,
        text: colors.text,
        Icon: FileEdit,
      },
      needs_review: {
        label: 'Needs review',
        shortLabel: 'Review',
        bg: 'rgba(245, 158, 11, 0.18)',
        border: '#F59E0B',
        text: colors.isDark ? '#FCD34D' : '#92400E',
        Icon: AlertTriangle,
      },
      ready: {
        label: 'Ready',
        shortLabel: 'Ready',
        bg: 'rgba(46, 125, 50, 0.16)',
        border: '#4CAF50',
        text: colors.isDark ? '#81C784' : '#1B5E20',
        Icon: CheckCircle2,
      },
    };

    const current = config[draftStatus];
    const StatusIcon = current.Icon;

    return (
      <View
        style={[
          styles.badge,
          compact && styles.badgeCompact,
          { backgroundColor: current.bg, borderColor: current.border },
        ]}
      >
        <StatusIcon size={compact ? 10 : 12} color={current.text} strokeWidth={2.4} />
        <Text style={[styles.label, compact && styles.labelCompact, { color: current.text }]} numberOfLines={1}>
          {compact ? current.shortLabel : current.label}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.badge,
        compact && styles.badgeCompact,
        { backgroundColor: colors.secondarySoft, borderColor: colors.secondary },
      ]}
    >
      <Unlock size={compact ? 10 : 12} color={colors.text} strokeWidth={2.3} />
      <Text style={[styles.label, compact && styles.labelCompact, { color: colors.text }]} numberOfLines={1}>
        Available
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
  },
  labelCompact: {
    fontSize: 10,
    fontWeight: '700',
  },
});
