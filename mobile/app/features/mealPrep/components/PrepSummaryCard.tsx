import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useCalendarColors } from '../../calendar/hooks/useCalendarColors';
import type { prepSummary } from '../utils/prepUtils';
import { formatMinutes } from '../utils/prepUtils';

interface PrepSummaryCardProps {
  summary: ReturnType<typeof prepSummary>;
  undecidedDayCount: number;
}

/** How the week's cooking stands. */
export function PrepSummaryCard({ summary, undecidedDayCount }: PrepSummaryCardProps) {
  const colors = useCalendarColors();
  const progress = summary.dishCount === 0 ? 0 : summary.doneCount / summary.dishCount;

  const stats = [
    { label: summary.dishCount === 1 ? 'dish' : 'dishes', value: String(summary.dishCount) },
    { label: summary.servings === 1 ? 'serving' : 'servings', value: String(summary.servings) },
    { label: 'cooking', value: summary.minutes > 0 ? formatMinutes(summary.minutes) : '–' },
  ];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.stats}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.stat}>
            <Text style={[styles.value, { color: colors.text }]}>{stat.value}</Text>
            <Text style={[styles.label, { color: colors.textMuted }]}>{stat.label}</Text>
          </View>
        ))}
      </View>
      <View
        style={[styles.track, { backgroundColor: colors.secondarySoft }]}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: summary.dishCount, now: summary.doneCount }}
      >
        <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
      </View>
      <Text style={[styles.note, { color: colors.textMuted }]}>
        {summary.doneCount} of {summary.dishCount} done
        {undecidedDayCount > 0
          ? ` · ${undecidedDayCount} more ${undecidedDayCount === 1 ? 'day' : 'days'} still being decided`
          : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 12 },
  stats: { flexDirection: 'row', marginBottom: 12 },
  stat: { flex: 1, alignItems: 'center' },
  value: { fontSize: 22, fontWeight: '800' },
  label: { fontSize: 11, marginTop: 1 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  note: { fontSize: 11, marginTop: 8, textAlign: 'center' },
});
