import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ArrowLeft, CheckCircle2, Lock, PencilLine, Send } from 'lucide-react-native';
import { ApiError } from '@/app/shared/services/apiClient';
import { haptics } from '@/app/shared/services/haptics';
import { useCalendarColors } from '../../calendar/hooks/useCalendarColors';
import { formatDisplayDate } from '../../calendar/utils/dateUtils';
import { SubmissionDeadline } from '../components/SubmissionDeadline';
import { useMealPlanner } from '../hooks/useMealPlanner';
import { useMealPlannerStore } from '../store/mealPlannerStore';
import {
  findMemberActiveProposal,
  formatBundleDishNames,
  getWeekDateKeys,
  PLANNER_MEAL_ORDER,
  toSlotKey,
} from '../utils/mealPlanner.utils';

export function MyWeeklyReviewScreen() {
  const colors = useCalendarColors();
  const planner = useMealPlanner();
  const submitWeeklyPlan = useMealPlannerStore((s) => s.submitWeeklyPlan);

  const weekDates = useMemo(() => getWeekDateKeys(planner.weekStart), [planner.weekStart]);
  const isDeadlinePassed = Boolean(planner.weekMeta?.isDeadlinePassed);
  const isLocked =
    !planner.isAdmin && (isDeadlinePassed || planner.mySubmission.status === 'locked');

  const handleSubmit = async () => {
    try {
      await submitWeeklyPlan();
      haptics.success();
      Alert.alert(
        'Weekly Meal Plan Submitted',
        'Your selections have been marked as Submitted and are ready for admin review. You can still update available slots until the deadline.',
      );
    } catch (error) {
      haptics.error();
      Alert.alert(
        'Could not submit weekly plan',
        error instanceof ApiError ? error.message : 'Please try again.',
      );
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
            onPress={() => planner.navigateTo('library')}
            accessibilityRole="button"
            accessibilityLabel="Back to Dish Library"
            style={({ pressed }) => [
              styles.backPill,
              { backgroundColor: colors.card, borderColor: colors.border },
              pressed && styles.pressed,
            ]}
          >
            <ArrowLeft size={16} color={colors.text} />
            <Text style={[styles.backPillText, { color: colors.text }]}>Dish Library</Text>
          </Pressable>

          <Text style={[styles.weekRangeText, { color: colors.textMuted }]}>
            Review for {planner.weekTitle}
          </Text>
        </View>

        {/* Hero Title & Submission Deadline Status */}
        <View style={styles.titleBlock}>
          <Text style={[styles.headline, { color: colors.text }]}>My Weekly Plan</Text>
          <Text style={[styles.subhead, { color: colors.textMuted }]}>
            Your meal selections for {planner.weekTitle}
          </Text>
        </View>

        <SubmissionDeadline
          submissionStatus={planner.mySubmission.status}
          submissionDeadline={planner.weekMeta?.submissionDeadline}
          submittedAt={planner.mySubmission.submittedAt}
          isDeadlinePassed={isDeadlinePassed}
        />

        {/* 7 Day Cards */}
        <View style={styles.daysList}>
          {weekDates.map((dateStr) => (
            <View
              key={dateStr}
              style={[
                styles.dayCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.dayTitle, { color: colors.text }]}>
                {formatDisplayDate(dateStr)}
              </Text>

              <View style={styles.mealsCol}>
                {PLANNER_MEAL_ORDER.map((mealCfg) => {
                  const coord = { date: dateStr, meal: mealCfg.key };
                  const slot = planner.slotsByKey[toSlotKey(coord)];
                  const isReserved = slot?.policy === 'reserved';
                  const activeProposal = findMemberActiveProposal(slot, planner.myId);
                  const dishes = isReserved
                    ? slot?.adminDraft.dishes ?? []
                    : activeProposal?.dishes ?? [];
                  const proposer =
                    activeProposal && activeProposal.proposerId !== planner.myId
                      ? planner.members.find((m) => m.id === activeProposal.proposerId)
                      : undefined;

                  return (
                    <View
                      key={mealCfg.key}
                      style={[
                        styles.mealRow,
                        {
                          backgroundColor: colors.inputBackground,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={styles.mealInfo}>
                        <View style={styles.mealTitleLine}>
                          <Text style={[styles.mealName, { color: colors.text }]}>
                            {mealCfg.label}
                          </Text>
                          {isReserved ? (
                            <View style={[styles.reservedPill, { backgroundColor: colors.primarySoft }]}>
                              <Lock size={10} color={colors.text} />
                              <Text style={[styles.reservedPillText, { color: colors.text }]}>
                                Reserved
                              </Text>
                            </View>
                          ) : proposer ? (
                            <Text style={[styles.joinedTag, { color: colors.textMuted }]}>
                              Joined {proposer.name}&apos;s meal
                            </Text>
                          ) : null}
                        </View>

                        <Text
                          style={[
                            styles.dishesSummary,
                            { color: dishes.length > 0 ? colors.text : colors.textMuted },
                          ]}
                          numberOfLines={2}
                        >
                          {dishes.length > 0
                            ? formatBundleDishNames(dishes)
                            : isReserved
                              ? 'Reserved by admin'
                              : 'No dishes chosen'}
                        </Text>
                      </View>

                      {!isLocked && (!isReserved || planner.isAdmin) ? (
                        <Pressable
                          onPress={() => {
                            haptics.selection();
                            planner.navigateTo('slot-details', { slot: coord });
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Edit ${formatDisplayDate(dateStr)} ${mealCfg.label}`}
                          style={({ pressed }) => [
                            styles.editBtn,
                            { backgroundColor: colors.card, borderColor: colors.secondary },
                            pressed && styles.pressed,
                          ]}
                        >
                          <PencilLine size={13} color={colors.text} />
                          <Text style={[styles.editBtnText, { color: colors.text }]}>Edit</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Submit Action */}
      {!isLocked ? (
        <View
          style={[
            styles.bottomBar,
            { backgroundColor: colors.card, borderTopColor: colors.border },
          ]}
        >
          <Pressable
            onPress={() => void handleSubmit()}
            disabled={planner.isSaving}
            accessibilityRole="button"
            accessibilityLabel="Submit Weekly Meal Plan"
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: colors.primary },
              pressed && styles.pressed,
            ]}
          >
            {planner.isSaving ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : planner.mySubmission.status === 'submitted' ? (
              <>
                <CheckCircle2 size={17} color={colors.onPrimary} strokeWidth={2.6} />
                <Text style={[styles.submitButtonText, { color: colors.onPrimary }]}>
                  Update Submitted Weekly Plan
                </Text>
              </>
            ) : (
              <>
                <Send size={16} color={colors.onPrimary} strokeWidth={2.5} />
                <Text style={[styles.submitButtonText, { color: colors.onPrimary }]}>
                  Submit Weekly Meal Plan
                </Text>
              </>
            )}
          </Pressable>
        </View>
      ) : null}
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
    paddingBottom: 120,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  weekRangeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  titleBlock: {
    gap: 2,
  },
  headline: {
    fontSize: 22,
    fontWeight: '800',
  },
  subhead: {
    fontSize: 13,
    fontWeight: '600',
  },
  daysList: {
    gap: 12,
  },
  dayCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  mealsCol: {
    gap: 8,
  },
  mealRow: {
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  mealInfo: {
    flex: 1,
    gap: 3,
  },
  mealTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealName: {
    fontSize: 13,
    fontWeight: '800',
  },
  reservedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  reservedPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  joinedTag: {
    fontSize: 11,
    fontWeight: '700',
  },
  dishesSummary: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  editBtn: {
    minHeight: 38,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
    borderTopWidth: 1,
  },
  submitButton: {
    minHeight: 50,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.84,
  },
});
