import React, { useEffect, useState } from 'react';
import { Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Check, Copy, Link2, RefreshCw, Share2 } from 'lucide-react-native';
import { HOUSEHOLD_COPY } from '../constants/household';
import { useHouseholdColors } from '../hooks/useHouseholdColors';
import type { Household } from '../types/household';

const COPIED_MESSAGE_MS = 2000;

type Copied = 'code' | 'link' | null;

interface HouseholdInviteCardProps {
  household: Household;
  canReset: boolean;
  onReset: () => void;
}

/** For people the admin can't add by email: they open the link or enter the code, then join. */
export function HouseholdInviteCard({ household, canReset, onReset }: HouseholdInviteCardProps) {
  const colors = useHouseholdColors();
  const [copied, setCopied] = useState<Copied>(null);
  const isFull = household.members.length >= household.maxMembers;

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(null), COPIED_MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async (what: 'code' | 'link') => {
    await Clipboard.setStringAsync(what === 'code' ? household.inviteCode : household.inviteLink);
    setCopied(what);
  };

  const shareInvite = () =>
    Share.share({ message: HOUSEHOLD_COPY.shareMessage(household.name, household.inviteLink, household.inviteCode) });

  const CodeIcon = copied === 'code' ? Check : Copy;
  const LinkIcon = copied === 'link' ? Check : Copy;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.titleRow}>
        <Link2 size={16} color={colors.secondary} />
        <Text style={[styles.title, { color: colors.text }]}>Invite with a link</Text>
      </View>
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        {HOUSEHOLD_COPY.inviteHint}
      </Text>

      <View style={[styles.codeField, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}>
        <View style={styles.codeText}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Invite code</Text>
          <Text selectable numberOfLines={1} style={[styles.code, { color: colors.text }]}>
            {household.inviteCode}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => copy('code')}
          hitSlop={8}
          style={styles.copyButton}
          accessibilityLabel={copied === 'code' ? 'Code copied' : 'Copy invite code'}
          accessibilityRole="button"
        >
          <CodeIcon size={15} color={colors.primary} />
          <Text style={[styles.copyText, { color: colors.primary }]}>{copied === 'code' ? 'Copied' : 'Copy'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          onPress={shareInvite}
          disabled={isFull}
          style={[styles.button, { backgroundColor: colors.primary, opacity: isFull ? 0.5 : 1 }]}
          accessibilityRole="button"
        >
          <Share2 size={15} color={colors.onPrimary} />
          <Text style={[styles.buttonText, { color: colors.onPrimary }]}>Share invite</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => copy('link')}
          style={[styles.button, { borderColor: colors.border, borderWidth: 1 }]}
          accessibilityLabel={copied === 'link' ? 'Link copied' : 'Copy invite link'}
          accessibilityRole="button"
        >
          <LinkIcon size={15} color={colors.text} />
          <Text style={[styles.buttonText, { color: colors.text }]} numberOfLines={1}>
            {copied === 'link' ? 'Copied' : 'Copy link'}
          </Text>
        </TouchableOpacity>
      </View>

      {canReset ? (
        <TouchableOpacity onPress={onReset} style={styles.resetButton} accessibilityRole="button">
          <RefreshCw size={13} color={colors.textMuted} />
          <Text style={[styles.resetText, { color: colors.textMuted }]}>Reset invite link</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '800' },
  hint: { fontSize: 12, lineHeight: 17, marginTop: 4, marginBottom: 12 },
  codeField: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  codeText: { flex: 1 },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  copyButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  copyText: { fontSize: 13, fontWeight: '800' },
  code: { fontSize: 22, fontWeight: '800', letterSpacing: 3 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  button: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, paddingVertical: 13 },
  buttonText: { fontSize: 14, fontWeight: '800' },
  resetButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 12 },
  resetText: { fontSize: 13, fontWeight: '600' },
});
