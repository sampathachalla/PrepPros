import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, GitMerge, Layers, UserCheck } from 'lucide-react-native';
import { haptics } from '@/app/shared/services/haptics';
import { useCalendarColors } from '../../calendar/hooks/useCalendarColors';
import type { BulkAssignStrategy, HouseholdMember } from '../types/mealPlanner.types';
import { HouseholdAvatarStack } from './HouseholdAvatarStack';

export interface MealSourceSelectorProps {
  members: HouseholdMember[];
  strategy: BulkAssignStrategy;
  sourceMemberIds: string[];
  onChangeStrategy: (strategy: BulkAssignStrategy) => void;
  onToggleMember: (memberId: string) => void;
}

export function MealSourceSelector({
  members,
  strategy,
  sourceMemberIds,
  onChangeStrategy,
  onToggleMember,
}: MealSourceSelectorProps) {
  const colors = useCalendarColors();

  const selectMemberComplete = (memberId: string) => {
    haptics.selection();
    onChangeStrategy('member_complete');
    onToggleMember(memberId);
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Choose meal source</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
        Copy a member&apos;s complete proposals or combine household requests across selected slots.
      </Text>

      {/* Option 1: Per-member complete meal buttons */}
      <View style={styles.memberList}>
        {members.map((member) => {
          const isSelected =
            strategy === 'member_complete' && sourceMemberIds[0] === member.id;
          return (
            <Pressable
              key={member.id}
              onPress={() => selectMemberComplete(member.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              style={({ pressed }) => [
                styles.optionRow,
                {
                  backgroundColor: isSelected ? colors.primarySoft : colors.inputBackground,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
                pressed && styles.pressed,
              ]}
            >
              <HouseholdAvatarStack members={[member]} size={24} overlap={0} maxVisible={1} />
              <View style={styles.optionTextWrap}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>
                  Use {member.name}&apos;s complete meals
                </Text>
                <Text style={[styles.optionHint, { color: colors.textMuted }]}>
                  Copies only into slots where {member.name} submitted a proposal
                </Text>
              </View>
              {isSelected ? (
                <Check size={16} color={colors.text} strokeWidth={2.8} />
              ) : (
                <UserCheck size={15} color={colors.textMuted} />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Option 2: Combine (Union) */}
      <Pressable
        onPress={() => {
          haptics.selection();
          onChangeStrategy('union');
        }}
        accessibilityRole="radio"
        accessibilityState={{ checked: strategy === 'union' }}
        style={({ pressed }) => [
          styles.optionRow,
          {
            backgroundColor: strategy === 'union' ? colors.secondarySoft : colors.inputBackground,
            borderColor: strategy === 'union' ? colors.secondary : colors.border,
          },
          pressed && styles.pressed,
        ]}
      >
        <Layers size={18} color={colors.text} />
        <View style={styles.optionTextWrap}>
          <Text style={[styles.optionTitle, { color: colors.text }]}>
            Combine selected members&apos; dishes
          </Text>
          <Text style={[styles.optionHint, { color: colors.textMuted }]}>
            Creates an editable union draft (flagged for review)
          </Text>
        </View>
        {strategy === 'union' ? <Check size={16} color={colors.text} strokeWidth={2.8} /> : null}
      </Pressable>

      {/* Option 3: Common Dishes (Intersection) */}
      <Pressable
        onPress={() => {
          haptics.selection();
          onChangeStrategy('intersection');
        }}
        accessibilityRole="radio"
        accessibilityState={{ checked: strategy === 'intersection' }}
        style={({ pressed }) => [
          styles.optionRow,
          {
            backgroundColor:
              strategy === 'intersection' ? colors.secondarySoft : colors.inputBackground,
            borderColor: strategy === 'intersection' ? colors.secondary : colors.border,
          },
          pressed && styles.pressed,
        ]}
      >
        <GitMerge size={18} color={colors.text} />
        <View style={styles.optionTextWrap}>
          <Text style={[styles.optionTitle, { color: colors.text }]}>
            Find common dishes (review required)
          </Text>
          <Text style={[styles.optionHint, { color: colors.textMuted }]}>
            Starting suggestion of shared dishes — never auto-finalized
          </Text>
        </View>
        {strategy === 'intersection' ? (
          <Check size={16} color={colors.text} strokeWidth={2.8} />
        ) : null}
      </Pressable>

      {/* Multi-member filter chips when Union or Intersection is active */}
      {(strategy === 'union' || strategy === 'intersection') && members.length > 1 ? (
        <View style={styles.memberFilterRow}>
          {members.map((member) => {
            const active = sourceMemberIds.includes(member.id);
            return (
              <Pressable
                key={member.id}
                onPress={() => {
                  haptics.selection();
                  onToggleMember(member.id);
                }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                style={[
                  styles.memberChip,
                  {
                    backgroundColor: active ? colors.primarySoft : colors.inputBackground,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.memberChipText, { color: colors.text }]}>{member.name}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  memberList: {
    gap: 8,
  },
  optionRow: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionTextWrap: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  optionHint: {
    fontSize: 11,
    fontWeight: '600',
  },
  memberFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  memberChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  memberChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.82,
  },
});
