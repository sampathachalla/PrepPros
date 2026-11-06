import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Clock, X } from 'lucide-react-native';
import { ApiError } from '@/app/shared/services/apiClient';
import { haptics } from '@/app/shared/services/haptics';
import { DEFAULT_TIMER_MINUTES, TIMER_DURATIONS } from '../constants/calendar';
import { useCalendarStore } from '../store/calendarStore';
import { useCalendarColors } from '../hooks/useCalendarColors';
import { formatDisplayDate } from '../utils/dateUtils';

interface StartTimerModalProps {
  visible: boolean;
  dateKey: string;
  /** Other planned days this week, which can go out on the same timer. */
  otherDates: string[];
  /** A fixed day can only be reopened, so skipping the timer makes no sense there. */
  canFixNow: boolean;
  onClose: () => void;
}

/** The admin chooses how long the household has to answer, or fixes the plan straight away. */
export function StartTimerModal({ visible, dateKey, otherDates, canFixNow, onClose }: StartTimerModalProps) {
  const colors = useCalendarColors();
  const [minutes, setMinutes] = useState(DEFAULT_TIMER_MINUTES);
  const [includeWeek, setIncludeWeek] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dates = includeWeek ? [dateKey, ...otherDates] : [dateKey];

  const run = async (action: () => Promise<void>, failure: string) => {
    setIsStarting(true);
    setError(null);
    try {
      await action();
      haptics.success();
      onClose();
    } catch (cause) {
      haptics.error();
      setError(cause instanceof ApiError ? cause.message : failure);
    } finally {
      setIsStarting(false);
    }
  };

  const start = () => run(() => useCalendarStore.getState().startTimer(dates, minutes), 'Could not start the timer.');
  const fixNow = () => run(() => useCalendarStore.getState().fixDays(dates), 'Could not fix the plan.');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <Clock size={18} color={colors.primary} />
              <Text style={[styles.title, { color: colors.text }]}>Start the timer</Text>
            </View>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" hitSlop={10}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Everyone can then accept a dish or suggest their own for {formatDisplayDate(dateKey)}. When it ends, the
            day is fixed.
          </Text>

          <Text style={[styles.label, { color: colors.text }]}>How long?</Text>
          <View style={styles.chips}>
            {TIMER_DURATIONS.map((option) => {
              const selected = option.minutes === minutes;
              return (
                <TouchableOpacity
                  key={option.minutes}
                  onPress={() => setMinutes(option.minutes)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? colors.primary : colors.inputBackground,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: selected ? colors.onPrimary : colors.text }]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {otherDates.length > 0 ? (
            <View style={styles.weekRow}>
              <View style={styles.weekText}>
                <Text style={[styles.label, styles.weekLabel, { color: colors.text }]}>Include the rest of the week</Text>
                <Text style={[styles.subtitle, styles.weekHint, { color: colors.textMuted }]}>
                  {otherDates.length} more planned {otherDates.length === 1 ? 'day' : 'days'}
                </Text>
              </View>
              <Switch
                value={includeWeek}
                onValueChange={setIncludeWeek}
                trackColor={{ true: colors.primary }}
                accessibilityLabel="Include the rest of the week"
              />
            </View>
          ) : null}

          {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

          <TouchableOpacity
            onPress={start}
            disabled={isStarting}
            style={[styles.startButton, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
          >
            {isStarting ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Text style={[styles.startText, { color: colors.onPrimary }]}>Start Timer</Text>
            )}
          </TouchableOpacity>

          {canFixNow ? (
            <TouchableOpacity
              onPress={fixNow}
              disabled={isStarting}
              style={[styles.fixButton, { borderColor: colors.border }]}
              accessibilityRole="button"
            >
              <Text style={[styles.fixText, { color: colors.text }]}>
                Fix {dates.length > 1 ? `${dates.length} days` : 'now'} without a timer
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, paddingBottom: 36 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 13, lineHeight: 18, marginTop: 6, marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '800', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  chipText: { fontSize: 13, fontWeight: '700' },
  weekRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  weekText: { flex: 1 },
  weekLabel: { marginBottom: 0 },
  weekHint: { marginTop: 2, marginBottom: 0 },
  error: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  startButton: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  startText: { fontSize: 16, fontWeight: '800' },
  fixButton: { borderWidth: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  fixText: { fontSize: 14, fontWeight: '800' },
});
