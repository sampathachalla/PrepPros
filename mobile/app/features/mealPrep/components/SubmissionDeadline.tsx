import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Clock3, FileEdit, Lock } from 'lucide-react-native';
import { useCalendarColors } from '../../calendar/hooks/useCalendarColors';
import type { SubmissionStatus } from '../types/mealPlanner.types';

export interface SubmissionDeadlineProps {
  submissionStatus: SubmissionStatus;
  submissionDeadline?: string | null;
  submittedAt?: string | null;
  isDeadlinePassed?: boolean;
}

export function SubmissionDeadline({
  submissionStatus,
  submissionDeadline,
  submittedAt,
  isDeadlinePassed = false,
}: SubmissionDeadlineProps) {
  const colors = useCalendarColors();

  const formattedDeadline = submissionDeadline
    ? new Date(submissionDeadline).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  const formattedSubmitted = submittedAt
    ? new Date(submittedAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  const statusConfig: Record<
    SubmissionStatus,
    { label: string; bg: string; border: string; Icon: typeof Clock3 }
  > = {
    draft: {
      label: 'Draft',
      bg: colors.secondarySoft,
      border: colors.secondary,
      Icon: FileEdit,
    },
    submitted: {
      label: 'Submitted · Pending admin review',
      bg: 'rgba(46, 125, 50, 0.16)',
      border: '#4CAF50',
      Icon: CheckCircle2,
    },
    locked: {
      label: 'Locked · Planning closed',
      bg: colors.primarySoft,
      border: colors.primary,
      Icon: Lock,
    },
  };

  const current = statusConfig[isDeadlinePassed ? 'locked' : submissionStatus];
  const StatusIcon = current.Icon;

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: current.bg, borderColor: current.border },
          ]}
        >
          <StatusIcon size={13} color={colors.text} strokeWidth={2.4} />
          <Text style={[styles.statusText, { color: colors.text }]}>{current.label}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Clock3 size={14} color={colors.textMuted} />
        <Text style={[styles.metaText, { color: colors.textMuted }]}>
          {isDeadlinePassed
            ? 'Submission window has closed. Choices are now in the admin finalization queue.'
            : formattedDeadline
              ? `Cutoff deadline: ${formattedDeadline}`
              : 'Planning window is open — you can edit unreserved slots before admin finalization.'}
        </Text>
      </View>

      {formattedSubmitted && submissionStatus === 'submitted' ? (
        <Text style={[styles.submittedAtText, { color: colors.textMuted }]}>
          Last submitted {formattedSubmitted}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  submittedAtText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
