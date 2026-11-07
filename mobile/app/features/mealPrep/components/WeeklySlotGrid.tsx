import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Eye,
  Lock,
  Plus,
  Trash2,
  Users,
} from 'lucide-react-native';
import { haptics } from '@/app/shared/services/haptics';
import { useCalendarColors } from '../../calendar/hooks/useCalendarColors';
import type {
  HouseholdMember,
  PlannerSlotViewModel,
  SlotCoord,
  WeeklySlotGridMode,
} from '../types/mealPlanner.types';
import {
  createDoubleTapCoordinator,
  doesUserHaveDishInSlot,
  formatShortDayLabel,
  formatSlotTitle,
  getSlotParticipantMembers,
  getWeekDateKeys,
  isSameSlot,
  PLANNER_MEAL_ORDER,
  toSlotKey,
} from '../utils/mealPlanner.utils';
import { HouseholdAvatarStack } from './HouseholdAvatarStack';

export interface WeeklySlotGridProps {
  mode: WeeklySlotGridMode;
  weekStart: string;
  slots: Record<string, PlannerSlotViewModel>;
  members: HouseholdMember[];
  myId: string;
  isAdmin?: boolean;
  selectedSlots: SlotCoord[];
  disabled?: boolean;
  /** Mode: 'dish-selection' — dish key being scheduled, to highlight slots where user already added it */
  activeDishKey?: string;
  activeDishName?: string;
  /** Single-tap handler (deferred by 220ms in 'dish-selection' mode to coordinate with double-tap) */
  onToggleSlot: (slot: SlotCoord) => void;
  /** Double-tap or accessible button handler to inspect household proposals for a slot */
  onInspectSlot?: (slot: SlotCoord) => void;
  /** Contextual 1-slot immediate add/remove handler in 'dish-selection' mode */
  onConfirmSingleSlot?: (slot: SlotCoord) => void;
  onRemoveDishFromSlot?: (slot: SlotCoord) => void;
}

/**
 * Shared 7 (Sun..Sat) x 4 (Breakfast, Lunch, Snack, Dinner) slot grid.
 * Used across:
 * - Page 2: Dish Weekly Slot Picker (mode="dish-selection")
 * - Page 5: Admin Manage Slots (mode="slot-management")
 * - Page 6: Admin Finalize Weekly Menu Mode A (mode="bulk-finalization")
 */
export function WeeklySlotGrid({
  mode,
  weekStart,
  slots,
  members,
  myId,
  isAdmin = false,
  selectedSlots,
  disabled = false,
  activeDishKey,
  onToggleSlot,
  onInspectSlot,
  onConfirmSingleSlot,
  onRemoveDishFromSlot,
}: WeeklySlotGridProps) {
  const colors = useCalendarColors();
  const weekDates = useMemo(() => getWeekDateKeys(weekStart), [weekStart]);
  const [focusedSlot, setFocusedSlot] = useState<SlotCoord | null>(null);

  const coordinatorRef = useRef(createDoubleTapCoordinator());
  useEffect(() => {
    const coord = coordinatorRef.current;
    return () => coord.clear();
  }, []);

  const handleCellPress = (coord: SlotCoord, isReserved: boolean) => {
    if (disabled) return;

    const key = toSlotKey(coord);
    setFocusedSlot(coord);

    if (mode === 'dish-selection') {
      // Regular members cannot select reserved slots, but CAN inspect them
      if (isReserved && !isAdmin) {
        haptics.selection();
        onInspectSlot?.(coord);
        return;
      }

      if (onInspectSlot) {
        coordinatorRef.current.registerTap(
          key,
          () => {
            haptics.selection();
            onToggleSlot(coord);
          },
          () => {
            haptics.press();
            onInspectSlot(coord);
          },
        );
      } else {
        haptics.selection();
        onToggleSlot(coord);
      }
      return;
    }

    haptics.selection();
    onToggleSlot(coord);
  };

  const singleSelectedSlot = selectedSlots.length === 1 ? selectedSlots[0] : null;
  const inspectTargetSlot = singleSelectedSlot ?? focusedSlot ?? {
    date: weekDates[0],
    meal: 'lunch' as const,
  };

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.gridCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {/* Column Header Row */}
        <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
          <View style={styles.dayHeaderCell}>
            <Text style={[styles.headerText, { color: colors.textMuted }]}>Day</Text>
          </View>
          {PLANNER_MEAL_ORDER.map((meal) => (
            <View key={meal.key} style={styles.mealHeaderCell}>
              <Text
                style={[styles.headerText, { color: colors.text }]}
                numberOfLines={1}
              >
                {meal.shortLabel}
              </Text>
            </View>
          ))}
        </View>

        {/* 7 Day Rows */}
        {weekDates.map((dateStr, rowIndex) => {
          const { dayName, dateNum } = formatShortDayLabel(dateStr);
          const isEvenRow = rowIndex % 2 === 1;

          return (
            <View
              key={dateStr}
              style={[
                styles.dayRow,
                rowIndex < weekDates.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                },
                isEvenRow && {
                  backgroundColor: colors.isDark
                    ? 'rgba(255, 255, 255, 0.02)'
                    : 'rgba(168, 221, 245, 0.08)',
                },
              ]}
            >
              {/* Day Label Cell */}
              <View style={styles.dayLabelCell}>
                <Text style={[styles.dayName, { color: colors.text }]}>{dayName}</Text>
                <Text style={[styles.dayNum, { color: colors.textMuted }]}>{dateNum}</Text>
              </View>

              {/* 4 Meal Slot Cells */}
              {PLANNER_MEAL_ORDER.map((meal) => {
                const coord: SlotCoord = { date: dateStr, meal: meal.key };
                const key = toSlotKey(coord);
                const slot = slots[key];
                const isSelected = selectedSlots.some((s) => isSameSlot(s, coord));
                const isReserved = slot?.policy === 'reserved';
                const alreadyHasDish =
                  mode === 'dish-selection' && activeDishKey
                    ? doesUserHaveDishInSlot(slot, myId, activeDishKey)
                    : false;
                const participants = getSlotParticipantMembers(slot, members);
                const proposalCount = slot?.proposals.filter((p) => p.dishes.length > 0).length ?? 0;
                const draftStatus = slot?.adminDraft.status ?? 'empty';
                const draftDishCount = slot?.adminDraft.dishes.length ?? 0;
                const draftFirstDish = slot?.adminDraft.dishes[0]?.name;

                let cellBg = colors.inputBackground;
                let cellBorder = colors.border;

                if (isSelected) {
                  cellBg = colors.primarySoft;
                  cellBorder = colors.primary;
                } else if (alreadyHasDish) {
                  cellBg = colors.secondarySoft;
                  cellBorder = colors.secondary;
                } else if (isReserved) {
                  cellBg = colors.isDark ? 'rgba(245, 175, 196, 0.10)' : 'rgba(245, 175, 196, 0.18)';
                  cellBorder = colors.primary;
                } else if (mode === 'bulk-finalization') {
                  if (draftStatus === 'ready') {
                    cellBg = 'rgba(46, 125, 50, 0.14)';
                    cellBorder = '#4CAF50';
                  } else if (draftStatus === 'needs_review') {
                    cellBg = 'rgba(245, 158, 11, 0.16)';
                    cellBorder = '#F59E0B';
                  }
                }

                const a11yParts = [
                  `${dayName} ${meal.label}`,
                  isReserved ? 'Reserved by admin' : 'Available',
                  isSelected ? 'Selected' : null,
                  alreadyHasDish ? 'Dish already added' : null,
                  participants.length > 0 ? `${participants.length} members` : null,
                ].filter(Boolean);

                return (
                  <Pressable
                    key={key}
                    onPress={() => handleCellPress(coord, isReserved)}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: isSelected,
                      disabled: disabled || (mode === 'dish-selection' && isReserved && !isAdmin),
                    }}
                    accessibilityLabel={a11yParts.join(', ')}
                    style={({ pressed }) => [
                      styles.slotCell,
                      {
                        backgroundColor: cellBg,
                        borderColor: cellBorder,
                      },
                      isSelected && styles.slotCellSelected,
                      pressed && styles.slotCellPressed,
                    ]}
                  >
                    {/* Top Indicator Row */}
                    <View style={styles.cellTopRow}>
                      {isReserved ? (
                        <Lock size={12} color={colors.primary} strokeWidth={2.5} />
                      ) : isSelected ? (
                        <View style={[styles.checkDot, { backgroundColor: colors.primary }]}>
                          <Check size={10} color={colors.onPrimary} strokeWidth={3} />
                        </View>
                      ) : alreadyHasDish ? (
                        <View style={[styles.checkDot, { backgroundColor: colors.secondary }]}>
                          <Check size={10} color={colors.onPrimary} strokeWidth={3} />
                        </View>
                      ) : mode === 'bulk-finalization' ? (
                        draftStatus === 'ready' ? (
                          <CheckCircle2 size={12} color="#4CAF50" />
                        ) : draftStatus === 'needs_review' ? (
                          <AlertTriangle size={12} color="#F59E0B" />
                        ) : (
                          <View style={[styles.emptyDot, { borderColor: colors.border }]} />
                        )
                      ) : (
                        <View style={[styles.emptyDot, { borderColor: colors.border }]} />
                      )}

                      {mode === 'bulk-finalization' ? (
                        <Text
                          style={[styles.cellBadgeText, { color: colors.textMuted }]}
                          numberOfLines={1}
                        >
                          {draftStatus === 'ready'
                            ? `${draftDishCount}d`
                            : draftStatus === 'needs_review'
                              ? 'Review'
                              : proposalCount > 0
                                ? `${proposalCount}p`
                                : ''}
                        </Text>
                      ) : isReserved ? (
                        <Text
                          style={[styles.cellBadgeText, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          Fixed
                        </Text>
                      ) : alreadyHasDish ? (
                        <Text
                          style={[styles.cellBadgeText, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          Added
                        </Text>
                      ) : null}
                    </View>

                    {/* Bottom / Center Content */}
                    {mode === 'bulk-finalization' ? (
                      <Text
                        style={[
                          styles.bulkCellLabel,
                          { color: draftFirstDish ? colors.text : colors.textMuted },
                        ]}
                        numberOfLines={1}
                      >
                        {draftFirstDish ?? (proposalCount > 0 ? `${proposalCount} req` : 'Empty')}
                      </Text>
                    ) : mode === 'slot-management' ? (
                      <View style={styles.slotManageMeta}>
                        {proposalCount > 0 ? (
                          <View style={styles.proposalPill}>
                            <Users size={10} color={colors.textMuted} />
                            <Text style={[styles.proposalCountText, { color: colors.textMuted }]}>
                              {proposalCount}
                            </Text>
                          </View>
                        ) : (
                          <Text style={[styles.slotPolicySubtext, { color: colors.textMuted }]}>
                            {isReserved ? 'Locked' : 'Open'}
                          </Text>
                        )}
                      </View>
                    ) : participants.length > 0 ? (
                      <View style={styles.avatarRow}>
                        <HouseholdAvatarStack
                          members={participants}
                          size={15}
                          overlap={5}
                          maxVisible={3}
                        />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </View>

      {/* Contextual 1-Slot Quick Action + Accessible "View household choices" Alternative */}
      {mode === 'dish-selection' ? (
        <View style={styles.assistBar}>
          {singleSelectedSlot && onConfirmSingleSlot ? (
            <Pressable
              onPress={() => {
                haptics.success();
                onConfirmSingleSlot(singleSelectedSlot);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Add to ${formatSlotTitle(singleSelectedSlot.date, singleSelectedSlot.meal)}`}
              style={({ pressed }) => [
                styles.quickAddButton,
                { backgroundColor: colors.primary },
                pressed && styles.pressed,
              ]}
            >
              <Plus size={15} color={colors.onPrimary} strokeWidth={2.6} />
              <Text style={[styles.quickAddText, { color: colors.onPrimary }]} numberOfLines={1}>
                Add to {formatSlotTitle(singleSelectedSlot.date, singleSelectedSlot.meal)}
              </Text>
            </Pressable>
          ) : focusedSlot &&
            activeDishKey &&
            doesUserHaveDishInSlot(slots[toSlotKey(focusedSlot)], myId, activeDishKey) &&
            onRemoveDishFromSlot ? (
            <Pressable
              onPress={() => {
                haptics.selection();
                onRemoveDishFromSlot(focusedSlot);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Remove from ${formatSlotTitle(focusedSlot.date, focusedSlot.meal)}`}
              style={({ pressed }) => [
                styles.quickRemoveButton,
                { borderColor: colors.error, backgroundColor: colors.card },
                pressed && styles.pressed,
              ]}
            >
              <Trash2 size={14} color={colors.error} />
              <Text style={[styles.quickRemoveText, { color: colors.error }]} numberOfLines={1}>
                Remove from {formatSlotTitle(focusedSlot.date, focusedSlot.meal)}
              </Text>
            </Pressable>
          ) : null}

          {onInspectSlot ? (
            <Pressable
              onPress={() => {
                haptics.selection();
                onInspectSlot(inspectTargetSlot);
              }}
              accessibilityRole="button"
              accessibilityLabel={`View household choices for ${formatSlotTitle(
                inspectTargetSlot.date,
                inspectTargetSlot.meal,
              )}`}
              style={({ pressed }) => [
                styles.inspectButton,
                {
                  backgroundColor: colors.secondarySoft,
                  borderColor: colors.secondary,
                },
                pressed && styles.pressed,
              ]}
            >
              <Eye size={15} color={colors.text} />
              <Text style={[styles.inspectButtonText, { color: colors.text }]} numberOfLines={1}>
                View household choices ({formatSlotTitle(inspectTargetSlot.date, inspectTargetSlot.meal)})
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  gridCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  dayHeaderCell: {
    width: 48,
    paddingLeft: 4,
  },
  mealHeaderCell: {
    flex: 1,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 6,
  },
  dayLabelCell: {
    width: 44,
    paddingLeft: 2,
    justifyContent: 'center',
  },
  dayName: {
    fontSize: 12,
    fontWeight: '800',
  },
  dayNum: {
    fontSize: 11,
    fontWeight: '600',
  },
  slotCell: {
    flex: 1,
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 5,
    justifyContent: 'space-between',
  },
  slotCellSelected: {
    borderWidth: 2,
  },
  slotCellPressed: {
    opacity: 0.78,
  },
  cellTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 3,
  },
  emptyDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  checkDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  avatarRow: {
    marginTop: 4,
    alignItems: 'flex-start',
  },
  bulkCellLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  slotManageMeta: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  proposalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  proposalCountText: {
    fontSize: 10,
    fontWeight: '700',
  },
  slotPolicySubtext: {
    fontSize: 9,
    fontWeight: '600',
  },
  assistBar: {
    gap: 8,
  },
  quickAddButton: {
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  quickAddText: {
    fontSize: 13,
    fontWeight: '800',
  },
  quickRemoveButton: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  quickRemoveText: {
    fontSize: 13,
    fontWeight: '700',
  },
  inspectButton: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  inspectButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.82,
  },
});
