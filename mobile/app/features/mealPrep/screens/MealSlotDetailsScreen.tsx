import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ArrowLeft, Lock, Plus, Sparkles, Users } from 'lucide-react-native';
import { haptics } from '@/app/shared/services/haptics';
import { useCalendarColors } from '../../calendar/hooks/useCalendarColors';
import { MealProposalCard } from '../components/MealProposalCard';
import { MealSlotStatus } from '../components/MealSlotStatus';
import { useHouseholdProposals } from '../hooks/useHouseholdProposals';
import { useMealPlanner } from '../hooks/useMealPlanner';
import { formatBundleDishNames, formatSlotTitle } from '../utils/mealPlanner.utils';

export function MealSlotDetailsScreen() {
  const colors = useCalendarColors();
  const planner = useMealPlanner();
  const slotCoord = planner.activeSlot;
  const details = useHouseholdProposals(slotCoord);

  if (!slotCoord) {
    return (
      <View style={[styles.emptyWrap, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Select a meal slot first</Text>
        <Pressable
          onPress={() => planner.navigateTo('library')}
          accessibilityRole="button"
          style={[styles.backBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.backBtnText, { color: colors.onPrimary }]}>Back to Library</Text>
        </Pressable>
      </View>
    );
  }

  const slotTitle = formatSlotTitle(slotCoord.date, slotCoord.meal);
  const adminFixedDishes = details.slot?.adminDraft.dishes ?? [];

  const handleBack = () => {
    if (planner.activeDish) {
      planner.navigateTo('weekly-picker');
    } else {
      planner.navigateTo('library');
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Back Navigation */}
        <View style={styles.topRow}>
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Back to previous screen"
            style={({ pressed }) => [
              styles.backPill,
              { backgroundColor: colors.card, borderColor: colors.border },
              pressed && styles.pressed,
            ]}
          >
            <ArrowLeft size={16} color={colors.text} />
            <Text style={[styles.backPillText, { color: colors.text }]}>
              {planner.activeDish ? 'Back to Slot Picker' : 'Back'}
            </Text>
          </Pressable>

          <MealSlotStatus policy={details.isReserved ? 'reserved' : 'available'} />
        </View>

        {/* Slot Hero Header */}
        <View
          style={[
            styles.slotHeaderCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.slotTitle, { color: colors.text }]}>{slotTitle}</Text>
          <Text style={[styles.slotSubtitle, { color: colors.textMuted }]}>
            {details.isReserved
              ? 'This meal slot is reserved by the household admin.'
              : 'Household meal choices — join a complete meal combination or keep your own.'}
          </Text>
        </View>

        {/* Admin Fixed Menu Box (when Reserved) */}
        {details.isReserved ? (
          <View
            style={[
              styles.reservedMenuCard,
              { backgroundColor: colors.primarySoft, borderColor: colors.primary },
            ]}
          >
            <View style={styles.reservedTopRow}>
              <Lock size={15} color={colors.text} strokeWidth={2.5} />
              <Text style={[styles.reservedTitle, { color: colors.text }]}>
                Admin&apos;s Fixed Menu
              </Text>
            </View>
            <Text style={[styles.reservedDishes, { color: colors.text }]}>
              {adminFixedDishes.length > 0
                ? formatBundleDishNames(adminFixedDishes)
                : 'Reserved by admin — menu dishes will be assigned during weekly finalization.'}
            </Text>
          </View>
        ) : null}

        {/* Household Proposals List */}
        {details.proposals.length > 0 ? (
          <View style={styles.proposalsList}>
            {details.proposals.map((proposal) => {
              const proposer = details.members.find((m) => m.id === proposal.proposerId);
              const isMyActiveChoice = details.myActiveProposal?.id === proposal.id;
              const isOwnProposal = proposal.proposerId === details.myId;

              return (
                <MealProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  proposer={proposer}
                  members={details.members}
                  myId={details.myId}
                  isMyActiveChoice={isMyActiveChoice}
                  isOwnProposal={isOwnProposal}
                  isSlotReserved={details.isReserved}
                  isLocked={details.isLocked}
                  onJoinProposal={details.joinProposal}
                  onKeepOwnMeal={() => void details.keepOwnMeal()}
                />
              );
            })}
          </View>
        ) : (
          <View
            style={[
              styles.emptyProposalsCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Users size={24} color={colors.secondary} />
            <Text style={[styles.emptyProposalsTitle, { color: colors.text }]}>
              No household proposals yet
            </Text>
            <Text style={[styles.emptyProposalsSubtitle, { color: colors.textMuted }]}>
              Be the first to pick dishes for {slotTitle} from the Dish Library.
            </Text>
          </View>
        )}

        {/* Bottom Actions: Keep my own meal / Browse Dish Library */}
        {!details.isReserved && !details.isLocked ? (
          <View style={styles.bottomActions}>
            {details.myOwnProposal &&
            details.myOwnProposal.dishes.length > 0 &&
            details.myActiveProposal?.id !== details.myOwnProposal.id ? (
              <Pressable
                onPress={() => {
                  haptics.selection();
                  void details.keepOwnMeal();
                }}
                accessibilityRole="button"
                accessibilityLabel="Keep my own meal"
                style={({ pressed }) => [
                  styles.keepOwnButton,
                  { backgroundColor: colors.secondarySoft, borderColor: colors.secondary },
                  pressed && styles.pressed,
                ]}
              >
                <Sparkles size={16} color={colors.text} />
                <Text style={[styles.keepOwnText, { color: colors.text }]}>
                  Keep my own meal ({formatBundleDishNames(details.myOwnProposal.dishes)})
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => {
                haptics.selection();
                planner.navigateTo('library');
              }}
              accessibilityRole="button"
              accessibilityLabel="Create or add dishes to my own meal"
              style={({ pressed }) => [
                styles.createOwnButton,
                { backgroundColor: colors.card, borderColor: colors.primary },
                pressed && styles.pressed,
              ]}
            >
              <Plus size={16} color={colors.text} strokeWidth={2.5} />
              <Text style={[styles.createOwnText, { color: colors.text }]}>
                {details.myOwnProposal?.dishes.length
                  ? 'Add another dish to my meal'
                  : 'Create my own meal from Dish Library'}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 96,
    gap: 12,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  backBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  backPill: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backPillText: {
    fontSize: 13,
    fontWeight: '800',
  },
  slotHeaderCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  slotTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  slotSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  reservedMenuCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  reservedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reservedTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  reservedDishes: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  proposalsList: {
    gap: 12,
  },
  emptyProposalsCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyProposalsTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptyProposalsSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  bottomActions: {
    gap: 10,
    marginTop: 4,
  },
  keepOwnButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  keepOwnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  createOwnButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createOwnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.84,
  },
});
