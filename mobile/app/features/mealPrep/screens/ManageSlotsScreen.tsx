import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ArrowLeft, Lock, Save, Unlock } from 'lucide-react-native';
import { haptics } from '@/app/shared/services/haptics';
import { useCalendarColors } from '../../calendar/hooks/useCalendarColors';
import { WeeklySlotGrid } from '../components/WeeklySlotGrid';
import { useMealPlanner } from '../hooks/useMealPlanner';
import { useWeeklySlots } from '../hooks/useWeeklySlots';
import type { SlotPolicyStatus } from '../types/mealPlanner.types';

const POLICY_MODES: { key: SlotPolicyStatus; label: string; Icon: typeof Unlock }[] = [
  { key: 'available', label: 'Available', Icon: Unlock },
  { key: 'reserved', label: 'Reserved', Icon: Lock },
];

export function ManageSlotsScreen() {
  const colors = useCalendarColors();
  const planner = useMealPlanner();
  const manager = useWeeklySlots();

  if (!planner.isAdmin) {
    return (
      <View style={[styles.emptyWrap, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          Only the household admin can manage slot availability
        </Text>
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

          <Text style={[styles.weekLabel, { color: colors.textMuted }]}>
            {planner.weekTitle}
          </Text>
        </View>

        {/* Header Card */}
        <View
          style={[
            styles.headerCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>Manage Meal Slots</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Choose which meals members can plan. Reserved slots lock member editing while retaining prior choices in history.
          </Text>

          {/* Mode Toggle: Available vs Reserved */}
          <View style={styles.modeSwitchRow} accessibilityRole="tablist">
            {POLICY_MODES.map(({ key, label, Icon }) => {
              const selected = manager.targetPolicy === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    haptics.selection();
                    manager.setTargetPolicy(key);
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  style={[
                    styles.modeTab,
                    {
                      backgroundColor: selected ? colors.primary : colors.inputBackground,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Icon size={14} color={selected ? colors.onPrimary : colors.textMuted} />
                  <Text
                    style={[
                      styles.modeTabText,
                      { color: selected ? colors.onPrimary : colors.text },
                    ]}
                  >
                    Mark as {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Summary Counts */}
          <View style={styles.countsRow}>
            <View style={[styles.countPill, { backgroundColor: colors.primarySoft }]}>
              <Lock size={12} color={colors.text} />
              <Text style={[styles.countPillText, { color: colors.text }]}>
                {manager.counts.reserved} reserved
              </Text>
            </View>
            <View style={[styles.countPill, { backgroundColor: colors.secondarySoft }]}>
              <Unlock size={12} color={colors.text} />
              <Text style={[styles.countPillText, { color: colors.text }]}>
                {manager.counts.available} available
              </Text>
            </View>
          </View>
        </View>

        {/* Shared 7 x 4 Grid in slot-management mode */}
        <WeeklySlotGrid
          mode="slot-management"
          weekStart={planner.weekStart}
          slots={planner.slotsByKey}
          members={planner.members}
          myId={planner.myId}
          isAdmin
          selectedSlots={manager.selectedSlots}
          disabled={manager.isSaving}
          onToggleSlot={manager.toggleSlot}
        />
      </ScrollView>

      {/* Bottom Save Bar */}
      {manager.selectedSlots.length > 0 ? (
        <View
          style={[
            styles.bottomBar,
            { backgroundColor: colors.card, borderTopColor: colors.border },
          ]}
        >
          <View style={styles.bottomMetaRow}>
            <Text style={[styles.bottomMetaText, { color: colors.text }]}>
              {manager.selectedSlots.length}{' '}
              {manager.selectedSlots.length === 1 ? 'slot' : 'slots'} selected →{' '}
              {manager.targetPolicy === 'reserved' ? 'Reserve' : 'Make Available'}
            </Text>
            <Pressable onPress={manager.clearSelection} accessibilityRole="button">
              <Text style={[styles.clearText, { color: colors.textMuted }]}>Clear</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => manager.savePolicies()}
            disabled={manager.isSaving}
            accessibilityRole="button"
            accessibilityLabel="Save Slot Availability"
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: colors.primary },
              pressed && styles.pressed,
            ]}
          >
            {manager.isSaving ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <>
                <Save size={16} color={colors.onPrimary} strokeWidth={2.5} />
                <Text style={[styles.saveButtonText, { color: colors.onPrimary }]}>
                  Save Slot Availability
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
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
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
  weekLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  headerCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  modeSwitchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeTab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '800',
  },
  countsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  countPillText: {
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
    gap: 8,
  },
  bottomMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomMetaText: {
    fontSize: 13,
    fontWeight: '800',
  },
  clearText: {
    fontSize: 12,
    fontWeight: '700',
  },
  saveButton: {
    minHeight: 50,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.84,
  },
});
