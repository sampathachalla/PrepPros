import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowLeft,
  CalendarCheck2,
  Columns,
  Grid,
  Search,
  X,
} from 'lucide-react-native';
import { haptics } from '@/app/shared/services/haptics';
import { useCalendarColors } from '../../calendar/hooks/useCalendarColors';
import { BulkActionBar } from '../components/BulkActionBar';
import { DailyReviewCarousel } from '../components/DailyReviewCarousel';
import { DishGrid } from '../components/DishGrid';
import { MealSourceSelector } from '../components/MealSourceSelector';
import { WeeklySlotGrid } from '../components/WeeklySlotGrid';
import { useAdminFinalization } from '../hooks/useAdminFinalization';
import { useMealPlanner } from '../hooks/useMealPlanner';
import { formatSlotTitle, toSlotKey } from '../utils/mealPlanner.utils';

export function FinalizeWeeklyMenuScreen() {
  const colors = useCalendarColors();
  const planner = useMealPlanner();
  const finalize = useAdminFinalization();
  const [modalQuery, setModalQuery] = useState('');

  const editingSlotData = useMemo(() => {
    if (!finalize.editingSlot) return undefined;
    return planner.slotsByKey[toSlotKey(finalize.editingSlot)];
  }, [finalize.editingSlot, planner.slotsByKey]);

  const selectedDishKeysInModal = useMemo(() => {
    const keys = new Set<string>();
    for (const d of editingSlotData?.adminDraft.dishes ?? []) {
      keys.add(d.dishKey);
    }
    return keys;
  }, [editingSlotData]);

  const requestedDishKeysInModal = useMemo(() => {
    const keys = new Set<string>();
    for (const prop of editingSlotData?.proposals ?? []) {
      for (const d of prop.dishes) {
        keys.add(d.dishKey);
      }
    }
    return keys;
  }, [editingSlotData]);

  const modalDishes = useMemo(() => {
    const q = modalQuery.trim().toLowerCase();
    // Show household-requested dishes for this slot first, then catalog dishes
    const sorted = [...planner.allCatalogDishes].sort((a, b) => {
      const aReq = requestedDishKeysInModal.has(a.dishKey) ? 0 : 1;
      const bReq = requestedDishKeysInModal.has(b.dishKey) ? 0 : 1;
      if (aReq !== bReq) return aReq - bReq;
      const aSel = selectedDishKeysInModal.has(a.dishKey) ? 0 : 1;
      const bSel = selectedDishKeysInModal.has(b.dishKey) ? 0 : 1;
      return aSel - bSel;
    });
    if (!q) return sorted;
    return sorted.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.reason?.toLowerCase().includes(q) ?? false),
    );
  }, [planner.allCatalogDishes, modalQuery, requestedDishKeysInModal, selectedDishKeysInModal]);

  if (!planner.isAdmin) {
    return (
      <View style={[styles.emptyWrap, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          Only the household admin can finalize and publish the weekly menu
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

        {/* Header & Mode Toggle: Bulk Grid | Daily Review */}
        <View
          style={[
            styles.headerCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>Finalize Weekly Menu</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Review household requests and prepare the final cooking plan. Switching modes never discards unsaved draft work.
          </Text>

          <View style={styles.modeSwitchRow} accessibilityRole="tablist">
            <Pressable
              onPress={() => {
                haptics.selection();
                finalize.setViewMode('bulk-grid');
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: finalize.viewMode === 'bulk-grid' }}
              style={[
                styles.modeTab,
                {
                  backgroundColor:
                    finalize.viewMode === 'bulk-grid' ? colors.primary : colors.inputBackground,
                  borderColor:
                    finalize.viewMode === 'bulk-grid' ? colors.primary : colors.border,
                },
              ]}
            >
              <Grid
                size={14}
                color={finalize.viewMode === 'bulk-grid' ? colors.onPrimary : colors.textMuted}
              />
              <Text
                style={[
                  styles.modeTabText,
                  {
                    color: finalize.viewMode === 'bulk-grid' ? colors.onPrimary : colors.text,
                  },
                ]}
              >
                Bulk Grid
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                haptics.selection();
                finalize.setViewMode('daily-review');
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: finalize.viewMode === 'daily-review' }}
              style={[
                styles.modeTab,
                {
                  backgroundColor:
                    finalize.viewMode === 'daily-review' ? colors.primary : colors.inputBackground,
                  borderColor:
                    finalize.viewMode === 'daily-review' ? colors.primary : colors.border,
                },
              ]}
            >
              <Columns
                size={14}
                color={
                  finalize.viewMode === 'daily-review' ? colors.onPrimary : colors.textMuted
                }
              />
              <Text
                style={[
                  styles.modeTabText,
                  {
                    color:
                      finalize.viewMode === 'daily-review' ? colors.onPrimary : colors.text,
                  },
                ]}
              >
                Daily Review
              </Text>
            </Pressable>
          </View>

          {/* Draft Health Summary Pills */}
          <View style={styles.healthRow}>
            <View style={[styles.healthPill, { backgroundColor: 'rgba(46, 125, 50, 0.14)' }]}>
              <Text style={[styles.healthPillText, { color: colors.text }]}>
                {finalize.weekHealth.readyCount} Ready
              </Text>
            </View>
            {finalize.weekHealth.needsReviewCount > 0 ? (
              <View style={[styles.healthPill, { backgroundColor: 'rgba(245, 158, 11, 0.18)' }]}>
                <Text style={[styles.healthPillText, { color: colors.text }]}>
                  {finalize.weekHealth.needsReviewCount} Needs Review
                </Text>
              </View>
            ) : null}
            <View style={[styles.healthPill, { backgroundColor: colors.inputBackground }]}>
              <Text style={[styles.healthPillText, { color: colors.textMuted }]}>
                {finalize.weekHealth.emptyCount} Empty
              </Text>
            </View>
          </View>
        </View>

        {/* Mode A: Bulk Grid OR Mode B: Daily Review Carousel */}
        {finalize.viewMode === 'bulk-grid' ? (
          <View style={styles.bulkSection}>
            <View style={styles.bulkGridHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Select meal slots ({finalize.selectedSlots.length} selected)
              </Text>
              <Pressable onPress={finalize.selectAllSlots} accessibilityRole="button">
                <Text style={[styles.selectAllText, { color: colors.secondary }]}>
                  {finalize.selectedSlots.length === 28 ? 'Clear all' : 'Select all 28'}
                </Text>
              </Pressable>
            </View>

            <WeeklySlotGrid
              mode="bulk-finalization"
              weekStart={planner.weekStart}
              slots={planner.slotsByKey}
              members={planner.members}
              myId={planner.myId}
              isAdmin
              selectedSlots={finalize.selectedSlots}
              disabled={finalize.isSaving}
              onToggleSlot={finalize.toggleSlot}
            />

            <MealSourceSelector
              members={planner.members}
              strategy={finalize.strategy}
              sourceMemberIds={finalize.sourceMemberIds}
              onChangeStrategy={finalize.setStrategy}
              onToggleMember={finalize.toggleSourceMember}
            />

            <BulkActionBar
              preview={finalize.preview}
              isSaving={finalize.isSaving}
              onApply={finalize.applyBulkAssignment}
            />
          </View>
        ) : (
          <DailyReviewCarousel
            weekStart={planner.weekStart}
            slots={planner.slotsByKey}
            onEditMealSlot={(coord) => {
              setModalQuery('');
              finalize.setEditingSlot(coord);
            }}
          />
        )}
      </ScrollView>

      {/* Persistent Publish Weekly Menu Bar */}
      <View
        style={[
          styles.publishBar,
          { backgroundColor: colors.card, borderTopColor: colors.border },
        ]}
      >
        <Pressable
          onPress={() => finalize.publishMenu()}
          disabled={finalize.isSaving}
          accessibilityRole="button"
          accessibilityLabel="Publish Weekly Menu"
          style={({ pressed }) => [
            styles.publishButton,
            { backgroundColor: colors.primary },
            pressed && styles.pressed,
          ]}
        >
          {finalize.isSaving ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <>
              <CalendarCheck2 size={17} color={colors.onPrimary} strokeWidth={2.6} />
              <Text style={[styles.publishButtonText, { color: colors.onPrimary }]}>
                {planner.weekMeta?.publishedVersion
                  ? planner.weekMeta.hasUnpublishedChanges
                    ? 'Republish Updated Weekly Menu'
                    : 'Publish Weekly Menu'
                  : 'Publish Weekly Menu'}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Scoped 2-Column DishGrid Modal for Mode B ("Edit Dishes") */}
      <Modal
        visible={finalize.editingSlot !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => finalize.setEditingSlot(null)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.modalTitleCol}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Edit{' '}
                {finalize.editingSlot
                  ? formatSlotTitle(finalize.editingSlot.date, finalize.editingSlot.meal)
                  : 'Meal'}
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                Tap dishes to add or remove from this slot&apos;s finalized menu (requested dishes shown first)
              </Text>
            </View>
            <Pressable
              onPress={() => finalize.setEditingSlot(null)}
              accessibilityRole="button"
              accessibilityLabel="Done editing slot dishes"
              style={[styles.donePill, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.donePillText, { color: colors.onPrimary }]}>Done</Text>
            </Pressable>
          </View>

          <DishGrid
            dishes={modalDishes}
            members={planner.members}
            selectedDishKeys={selectedDishKeysInModal}
            requestedDishKeys={requestedDishKeysInModal}
            onSelectDish={(dish) => void finalize.toggleDishInEditingSlot(dish)}
            ListHeaderComponent={
              <View style={styles.modalSearchWrap}>
                <View
                  style={[
                    styles.searchBar,
                    { backgroundColor: colors.inputBackground, borderColor: colors.border },
                  ]}
                >
                  <Search size={15} color={colors.textMuted} />
                  <TextInput
                    value={modalQuery}
                    onChangeText={setModalQuery}
                    placeholder="Search catalog dishes…"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.searchInput, { color: colors.text }]}
                  />
                  {modalQuery.length > 0 ? (
                    <Pressable onPress={() => setModalQuery('')}>
                      <X size={15} color={colors.textMuted} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            }
          />
        </View>
      </Modal>
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
  healthRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  healthPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  healthPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  bulkSection: {
    gap: 12,
  },
  bulkGridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: '800',
  },
  publishBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
    borderTopWidth: 1,
  },
  publishButton: {
    minHeight: 50,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  publishButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  modalTitleCol: {
    flex: 1,
    gap: 2,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  donePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  donePillText: {
    fontSize: 13,
    fontWeight: '800',
  },
  modalSearchWrap: {
    paddingTop: 12,
    paddingBottom: 6,
  },
  searchBar: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.84,
  },
});
