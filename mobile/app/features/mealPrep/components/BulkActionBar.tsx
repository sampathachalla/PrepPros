import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { useCalendarColors } from '../../calendar/hooks/useCalendarColors';
import type { BulkAssignResult } from '../types/mealPlanner.types';

export interface BulkActionBarProps {
  preview: BulkAssignResult;
  isSaving?: boolean;
  onApply: () => void;
}

export function BulkActionBar({ preview, isSaving = false, onApply }: BulkActionBarProps) {
  const colors = useCalendarColors();

  if (preview.selectedCount === 0) return null;

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.metricsRow}>
        <View style={[styles.metricPill, { backgroundColor: colors.secondarySoft }]}>
          <Text style={[styles.metricValue, { color: colors.text }]}>{preview.selectedCount}</Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>selected</Text>
        </View>
        <View style={[styles.metricPill, { backgroundColor: 'rgba(46, 125, 50, 0.14)' }]}>
          <Text style={[styles.metricValue, { color: colors.text }]}>{preview.populatedCount}</Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>populated</Text>
        </View>
        <View style={[styles.metricPill, { backgroundColor: colors.inputBackground }]}>
          <Text style={[styles.metricValue, { color: colors.text }]}>{preview.emptyCount}</Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>still empty</Text>
        </View>
        {preview.needsReviewCount > 0 ? (
          <View style={[styles.metricPill, { backgroundColor: 'rgba(245, 158, 11, 0.18)' }]}>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {preview.needsReviewCount}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>review</Text>
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={onApply}
        disabled={isSaving}
        accessibilityRole="button"
        accessibilityLabel={`Preview and apply ${preview.selectedCount} slot assignments`}
        style={({ pressed }) => [
          styles.applyButton,
          { backgroundColor: colors.primary },
          pressed && styles.pressed,
        ]}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color={colors.onPrimary} />
        ) : (
          <>
            <Sparkles size={16} color={colors.onPrimary} />
            <Text style={[styles.applyText, { color: colors.onPrimary }]}>
              Preview & Apply {preview.selectedCount} Slot{' '}
              {preview.selectedCount === 1 ? 'Assignment' : 'Assignments'}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricPill: {
    flex: 1,
    minWidth: 70,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  applyButton: {
    minHeight: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  applyText: {
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.85,
  },
});
