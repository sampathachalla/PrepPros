import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { ArrowLeft, Check, Clock3, Lock, Plus, Utensils } from 'lucide-react-native';
import { useCalendarColors } from '../../calendar/hooks/useCalendarColors';
import { WeeklySlotGrid } from '../components/WeeklySlotGrid';
import { useDishSelections } from '../hooks/useDishSelections';
import { useMealPlanner } from '../hooks/useMealPlanner';
import type { SlotCoord } from '../types/mealPlanner.types';

export function DishWeeklyPickerScreen() {
  const colors = useCalendarColors();
  const planner = useMealPlanner();
  const dish = planner.activeDish;
  const selections = useDishSelections(dish);

  if (!dish) {
    return (
      <View style={[styles.emptyWrap, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Select a dish first</Text>
        <Pressable
          onPress={() => planner.navigateTo('library')}
          accessibilityRole="button"
          style={[styles.backButton, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.backButtonText, { color: colors.onPrimary }]}>
            Back to Dish Library
          </Text>
        </Pressable>
      </View>
    );
  }

  const handleInspectSlot = (coord: SlotCoord) => {
    planner.navigateTo('slot-details', { slot: coord });
  };

  const handleConfirmSingleSlot = async (coord: SlotCoord) => {
    const ok = await selections.confirmAddSlots([coord]);
    if (ok) {
      selections.clearSelection();
    }
  };

  const handleConfirmBatch = async () => {
    const ok = await selections.confirmAddSlots(selections.selectedSlots);
    if (ok) {
      planner.navigateTo('library');
    }
  };

  const selectedCount = selections.selectedSlots.length;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Back & Week Bar */}
        <View style={styles.topNavRow}>
          <Pressable
            onPress={() => planner.navigateTo('library')}
            accessibilityRole="button"
            accessibilityLabel="Back to Dish Library"
            style={({ pressed }) => [
              styles.navBackPill,
              { backgroundColor: colors.card, borderColor: colors.border },
              pressed && styles.pressed,
            ]}
          >
            <ArrowLeft size={16} color={colors.text} />
            <Text style={[styles.navBackText, { color: colors.text }]}>Dish Library</Text>
          </Pressable>

          <Text style={[styles.weekLabel, { color: colors.textMuted }]}>
            Week of {planner.weekTitle}
          </Text>
        </View>

        {/* Selected Dish Hero Card */}
        <View
          style={[
            styles.dishHeroCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {dish.imageUrl ? (
            <Image
              source={{ uri: dish.imageUrl }}
              style={styles.dishImage}
              contentFit="cover"
              transition={160}
            />
          ) : (
            <View style={[styles.dishPlaceholder, { backgroundColor: colors.secondarySoft }]}>
              <Utensils size={24} color={colors.text} />
            </View>
          )}

          <View style={styles.dishHeroBody}>
            <Text style={[styles.dishName, { color: colors.text }]} numberOfLines={2}>
              {dish.name}
            </Text>
            <Text style={[styles.dishSubtitle, { color: colors.textMuted }]}>
              Select when you want to eat this dish
            </Text>
            <View style={styles.dishMetaRow}>
              {dish.minutes ? (
                <View style={[styles.metaChip, { backgroundColor: colors.inputBackground }]}>
                  <Clock3 size={11} color={colors.textMuted} />
                  <Text style={[styles.metaChipText, { color: colors.textMuted }]}>
                    {dish.minutes}m
                  </Text>
                </View>
              ) : null}
              {selections.existingDishSlots.length > 0 ? (
                <View style={[styles.metaChip, { backgroundColor: colors.secondarySoft }]}>
                  <Check size={11} color={colors.text} strokeWidth={2.8} />
                  <Text style={[styles.metaChipText, { color: colors.text }]}>
                    In {selections.existingDishSlots.length}{' '}
                    {selections.existingDishSlots.length === 1 ? 'slot' : 'slots'}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Legend & Gesture Hint */}
        <View style={styles.legendRow}>
          <Text style={[styles.legendHint, { color: colors.textMuted }]}>
            Tap cells to select multiple meal times • Double-tap (or use button below) to view household choices
          </Text>
        </View>

        {selections.isLockedForMember ? (
          <View style={[styles.lockedNotice, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
            <Lock size={14} color={colors.text} />
            <Text style={[styles.lockedNoticeText, { color: colors.text }]}>
              Submission deadline has passed. Slots are view-only.
            </Text>
          </View>
        ) : null}

        {/* Shared 7 x 4 Weekly Slot Grid */}
        <WeeklySlotGrid
          mode="dish-selection"
          weekStart={planner.weekStart}
          slots={planner.slotsByKey}
          members={planner.members}
          myId={planner.myId}
          isAdmin={planner.isAdmin}
          selectedSlots={selections.selectedSlots}
          disabled={selections.isSaving}
          activeDishKey={dish.dishKey}
          activeDishName={dish.name}
          onToggleSlot={selections.toggleSlot}
          onInspectSlot={handleInspectSlot}
          onConfirmSingleSlot={(coord) => void handleConfirmSingleSlot(coord)}
          onRemoveDishFromSlot={(coord) => void selections.removeDishFromSlot(coord)}
        />
      </ScrollView>

      {/* Prominent Bottom Action Bar when >= 1 slots are selected */}
      {selectedCount > 0 ? (
        <View
          style={[
            styles.bottomBar,
            { backgroundColor: colors.card, borderTopColor: colors.border },
          ]}
        >
          <View style={styles.bottomSummary}>
            <Text style={[styles.bottomCountText, { color: colors.text }]}>
              {selectedCount} {selectedCount === 1 ? 'slot' : 'slots'} selected
            </Text>
            <Pressable
              onPress={selections.clearSelection}
              accessibilityRole="button"
              accessibilityLabel="Clear selected slots"
            >
              <Text style={[styles.clearText, { color: colors.textMuted }]}>Clear</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => void handleConfirmBatch()}
            disabled={selections.isSaving}
            accessibilityRole="button"
            accessibilityLabel={`Add ${dish.name} to ${selectedCount} ${
              selectedCount === 1 ? 'slot' : 'slots'
            }`}
            style={({ pressed }) => [
              styles.primaryCta,
              { backgroundColor: colors.primary },
              pressed && styles.pressed,
            ]}
          >
            {selections.isSaving ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <>
                <Plus size={17} color={colors.onPrimary} strokeWidth={2.8} />
                <Text style={[styles.primaryCtaText, { color: colors.onPrimary }]} numberOfLines={1}>
                  Add {dish.name} to {selectedCount} {selectedCount === 1 ? 'slot' : 'slots'}
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
    paddingBottom: 130,
    gap: 12,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  backButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBackPill: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navBackText: {
    fontSize: 13,
    fontWeight: '800',
  },
  weekLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  dishHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  dishImage: {
    width: 72,
    height: 72,
    borderRadius: 14,
  },
  dishPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dishHeroBody: {
    flex: 1,
    gap: 4,
  },
  dishName: {
    fontSize: 17,
    fontWeight: '800',
  },
  dishSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  dishMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  legendRow: {
    paddingHorizontal: 4,
  },
  legendHint: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  lockedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  lockedNoticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
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
    gap: 8,
  },
  bottomSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomCountText: {
    fontSize: 13,
    fontWeight: '800',
  },
  clearText: {
    fontSize: 12,
    fontWeight: '700',
  },
  primaryCta: {
    minHeight: 50,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  primaryCtaText: {
    fontSize: 15,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.84,
  },
});
