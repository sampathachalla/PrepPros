import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Check, Lock, Sparkles, Utensils } from 'lucide-react-native';
import { haptics } from '@/app/shared/services/haptics';
import { useCalendarColors } from '../../calendar/hooks/useCalendarColors';
import type { HouseholdMember, MealProposal } from '../types/mealPlanner.types';
import { formatBundleDishNames } from '../utils/mealPlanner.utils';
import { HouseholdAvatarStack } from './HouseholdAvatarStack';

export interface MealProposalCardProps {
  proposal: MealProposal;
  proposer?: HouseholdMember;
  members: HouseholdMember[];
  myId: string;
  isMyActiveChoice: boolean;
  isOwnProposal: boolean;
  isSlotReserved: boolean;
  isLocked: boolean;
  onJoinProposal: (proposal: MealProposal) => void;
  onKeepOwnMeal: () => void;
}

export function MealProposalCard({
  proposal,
  proposer,
  members,
  myId,
  isMyActiveChoice,
  isOwnProposal,
  isSlotReserved,
  isLocked,
  onJoinProposal,
  onKeepOwnMeal,
}: MealProposalCardProps) {
  const colors = useCalendarColors();

  const joinedMembers = members.filter((m) => proposal.participantMemberIds.includes(m.id));
  const joinedCount = Math.max(joinedMembers.length, proposal.participantMemberIds.length);
  const proposerName =
    proposer?.id === myId ? 'My meal option' : `${proposer?.name ?? 'Member'}'s meal`;
  const firstImage = proposal.dishes.find((d) => Boolean(d.imageUrl))?.imageUrl;
  const bundleNames = formatBundleDishNames(proposal.dishes);

  const handleAction = () => {
    haptics.selection();
    if (isOwnProposal && !isMyActiveChoice) {
      onKeepOwnMeal();
    } else if (!isMyActiveChoice) {
      onJoinProposal(proposal);
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isMyActiveChoice ? colors.primary : colors.border,
        },
        isMyActiveChoice && styles.cardActive,
      ]}
    >
      {/* Card Header: Proposer & Joined Avatars */}
      <View style={styles.headerRow}>
        <View style={styles.proposerInfo}>
          {proposer ? (
            <HouseholdAvatarStack members={[proposer]} size={26} overlap={0} maxVisible={1} />
          ) : null}
          <View>
            <Text style={[styles.proposerTitle, { color: colors.text }]} numberOfLines={1}>
              {proposerName}
            </Text>
            <Text style={[styles.joinedSubtitle, { color: colors.textMuted }]}>
              {joinedCount} {joinedCount === 1 ? 'member' : 'members'} joined
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {joinedMembers.length > 0 ? (
            <HouseholdAvatarStack members={joinedMembers} size={22} overlap={6} maxVisible={4} />
          ) : null}
          {isMyActiveChoice ? (
            <View style={[styles.activeBadge, { backgroundColor: colors.primary }]}>
              <Check size={12} color={colors.onPrimary} strokeWidth={3} />
              <Text style={[styles.activeBadgeText, { color: colors.onPrimary }]}>Your choice</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Hero Thumbnail + Dish Chips */}
      <View style={[styles.bundleBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
        {firstImage ? (
          <Image
            source={{ uri: firstImage }}
            style={styles.thumbnail}
            contentFit="cover"
            transition={160}
          />
        ) : (
          <View style={[styles.thumbPlaceholder, { backgroundColor: colors.secondarySoft }]}>
            <Utensils size={20} color={colors.text} />
          </View>
        )}

        <View style={styles.bundleContent}>
          <Text style={[styles.bundleText, { color: colors.text }]} numberOfLines={2}>
            {bundleNames}
          </Text>
          <View style={styles.chipWrap}>
            {proposal.dishes.map((dish, idx) => (
              <View
                key={`${dish.dishKey}-${idx}`}
                style={[
                  styles.dishChip,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.dishChipText, { color: colors.text }]} numberOfLines={1}>
                  {dish.name}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Action Footer */}
      {isSlotReserved ? (
        <View style={[styles.reservedRow, { backgroundColor: colors.primarySoft }]}>
          <Lock size={13} color={colors.text} />
          <Text style={[styles.reservedText, { color: colors.text }]}>
            Fixed by admin — household members cannot replace this menu
          </Text>
        </View>
      ) : !isLocked ? (
        <Pressable
          onPress={handleAction}
          disabled={isMyActiveChoice}
          accessibilityRole="button"
          accessibilityState={{ selected: isMyActiveChoice, disabled: isMyActiveChoice }}
          accessibilityLabel={
            isMyActiveChoice
              ? `Currently eating ${proposerName}`
              : isOwnProposal
                ? 'Keep my own meal'
                : `I'll eat ${proposerName}`
          }
          style={({ pressed }) => [
            styles.actionButton,
            isMyActiveChoice
              ? { backgroundColor: colors.secondarySoft, borderColor: colors.secondary, borderWidth: 1 }
              : { backgroundColor: colors.primary },
            pressed && !isMyActiveChoice && styles.pressed,
          ]}
        >
          {isMyActiveChoice ? (
            <>
              <Check size={15} color={colors.text} strokeWidth={2.8} />
              <Text style={[styles.actionButtonText, { color: colors.text }]}>
                Eating this meal
              </Text>
            </>
          ) : isOwnProposal ? (
            <>
              <Sparkles size={15} color={colors.onPrimary} />
              <Text style={[styles.actionButtonText, { color: colors.onPrimary }]}>
                Keep my own meal
              </Text>
            </>
          ) : (
            <Text style={[styles.actionButtonText, { color: colors.onPrimary }]}>
              I&apos;ll eat this meal
            </Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  cardActive: {
    borderWidth: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  proposerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  proposerTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  joinedSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  bundleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  thumbnail: {
    width: 68,
    height: 68,
    borderRadius: 12,
  },
  thumbPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bundleContent: {
    flex: 1,
    gap: 6,
  },
  bundleText: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  dishChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  dishChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  reservedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  reservedText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  actionButton: {
    minHeight: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.84,
  },
});
