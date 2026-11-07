import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Apple, Moon, PencilLine, Sun, Utensils } from 'lucide-react-native';
import { haptics } from '@/app/shared/services/haptics';
import { MEAL_CATEGORY_COLORS } from '../../calendar/constants/calendar';
import { useCalendarColors } from '../../calendar/hooks/useCalendarColors';
import { formatDisplayDate } from '../../calendar/utils/dateUtils';
import type {
  MealCategory,
  PlannerSlotViewModel,
  SlotCoord,
} from '../types/mealPlanner.types';
import {
  formatBundleDishNames,
  PLANNER_MEAL_ORDER,
  toSlotKey,
} from '../utils/mealPlanner.utils';
import { MealSlotStatus } from './MealSlotStatus';

export interface DailyMealCardProps {
  dateStr: string;
  slots: Record<string, PlannerSlotViewModel>;
  onEditMealSlot: (coord: SlotCoord) => void;
}

const ICONS: Record<MealCategory, typeof Sun> = {
  breakfast: Sun,
  lunch: Utensils,
  snacks: Apple,
  dinner: Moon,
};

export function DailyMealCard({ dateStr, slots, onEditMealSlot }: DailyMealCardProps) {
  const colors = useCalendarColors();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.dayHeader}>
        <Text style={[styles.dayTitle, { color: colors.text }]}>{formatDisplayDate(dateStr)}</Text>
      </View>

      <View style={styles.mealList}>
        {PLANNER_MEAL_ORDER.map((mealCfg) => {
          const coord: SlotCoord = { date: dateStr, meal: mealCfg.key };
          const slot = slots[toSlotKey(coord)];
          const draftDishes = slot?.adminDraft.dishes ?? [];
          const draftStatus =
            draftDishes.length === 0
              ? 'empty'
              : slot?.adminDraft.status === 'needs_review'
                ? 'needs_review'
                : 'ready';
          const proposalCount =
            slot?.proposals.filter((p) => p.dishes.length > 0).length ?? 0;
          const accent = MEAL_CATEGORY_COLORS[mealCfg.key];
          const Icon = ICONS[mealCfg.key];

          return (
            <View
              key={mealCfg.key}
              style={[
                styles.mealRow,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor:
                    draftStatus === 'needs_review'
                      ? '#F59E0B'
                      : draftStatus === 'empty'
                        ? colors.border
                        : colors.secondary,
                },
              ]}
            >
              <View style={styles.mealHeaderRow}>
                <View style={styles.mealTitleGroup}>
                  <View style={[styles.iconBubble, { backgroundColor: `${accent}33` }]}>
                    <Icon size={14} color={accent} />
                  </View>
                  <Text style={[styles.mealLabel, { color: colors.text }]}>{mealCfg.label}</Text>
                </View>

                <View style={styles.badgesGroup}>
                  {slot?.policy === 'reserved' ? (
                    <MealSlotStatus policy="reserved" compact />
                  ) : null}
                  <MealSlotStatus draftStatus={draftStatus} compact />
                </View>
              </View>

              <Text
                style={[
                  styles.dishesText,
                  { color: draftDishes.length > 0 ? colors.text : colors.textMuted },
                ]}
                numberOfLines={2}
              >
                {draftDishes.length > 0
                  ? formatBundleDishNames(draftDishes)
                  : proposalCount > 0
                    ? `Empty draft · ${proposalCount} household ${
                        proposalCount === 1 ? 'proposal' : 'proposals'
                      } waiting`
                    : 'No dishes assigned yet'}
              </Text>

              {slot?.adminDraft.sourceNote ? (
                <Text style={[styles.sourceNote, { color: colors.textMuted }]} numberOfLines={1}>
                  Source: {slot.adminDraft.sourceNote}
                </Text>
              ) : null}

              <Pressable
                onPress={() => {
                  haptics.selection();
                  onEditMealSlot(coord);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Edit dishes for ${formatDisplayDate(dateStr)} ${mealCfg.label}`}
                style={({ pressed }) => [
                  styles.editButton,
                  { borderColor: accent, backgroundColor: colors.card },
                  pressed && styles.pressed,
                ]}
              >
                <PencilLine size={13} color={colors.text} />
                <Text style={[styles.editButtonText, { color: colors.text }]}>
                  Edit {mealCfg.label} Dishes
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  mealList: {
    gap: 10,
  },
  mealRow: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  mealHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  mealTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  badgesGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dishesText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  sourceNote: {
    fontSize: 11,
    fontWeight: '600',
  },
  editButton: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.82,
  },
});
