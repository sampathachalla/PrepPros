import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Home, Link2, Users } from 'lucide-react-native';
import { ApiError } from '@/app/shared/services/apiClient';
import { HOUSEHOLD_COPY } from '../constants/household';
import { useHouseholdColors } from '../hooks/useHouseholdColors';
import { useHouseholdStore } from '../store/householdStore';

type Action = 'create' | 'join';

/** Shown until the person belongs to a household: planning needs one. */
export function HouseholdSetupCard() {
  const colors = useHouseholdColors();
  const create = useHouseholdStore((state) => state.create);
  const join = useHouseholdStore((state) => state.join);
  const pendingInviteCode = useHouseholdStore((state) => state.pendingInviteCode);

  const [name, setName] = useState('');
  const [typedCode, setTypedCode] = useState<string | null>(null);
  const [working, setWorking] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const code = typedCode ?? pendingInviteCode ?? '';

  const run = async (action: Action, task: () => Promise<void>) => {
    setWorking(action);
    setError(null);
    try {
      await task();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Something went wrong. Please try again.');
      setWorking(null);
    }
  };

  const inputStyle = [
    styles.input,
    { borderColor: colors.border, backgroundColor: colors.inputBackground, color: colors.text },
  ];

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View style={[styles.iconBubble, { backgroundColor: colors.primarySoft }]}>
        <Users size={28} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{HOUSEHOLD_COPY.setupTitle}</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>{HOUSEHOLD_COPY.setupSubtitle}</Text>

      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Link2 size={16} color={colors.secondary} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>{HOUSEHOLD_COPY.joinTitle}</Text>
        </View>
        <Text style={[styles.hint, { color: colors.textMuted }]}>{HOUSEHOLD_COPY.joinHint}</Text>
        <TextInput
          value={code}
          onChangeText={setTypedCode}
          placeholder="Invite link or code"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          style={inputStyle}
        />
        <TouchableOpacity
          disabled={working !== null || !code.trim()}
          onPress={() => run('join', () => join(code.trim()))}
          style={[styles.button, { backgroundColor: colors.secondary, opacity: code.trim() ? 1 : 0.5 }]}
          accessibilityRole="button"
        >
          {working === 'join' ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.onPrimary }]}>Join Household</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Home size={16} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>{HOUSEHOLD_COPY.createTitle}</Text>
        </View>
        <Text style={[styles.hint, { color: colors.textMuted }]}>{HOUSEHOLD_COPY.createHint}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Household name"
          placeholderTextColor={colors.textMuted}
          maxLength={60}
          style={inputStyle}
        />
        <TouchableOpacity
          disabled={working !== null || name.trim().length < 2}
          onPress={() => run('create', () => create(name.trim()))}
          style={[styles.button, { backgroundColor: colors.primary, opacity: name.trim().length >= 2 ? 1 : 0.5 }]}
          accessibilityRole="button"
        >
          {working === 'create' ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.onPrimary }]}>Create Household</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, alignItems: 'center' },
  iconBubble: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  title: { fontSize: 22, fontWeight: '800', marginTop: 14 },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 16, lineHeight: 20 },
  error: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  card: { width: '100%', borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  hint: { fontSize: 12, marginTop: 4, marginBottom: 10, lineHeight: 17 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, marginBottom: 10 },
  button: { borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  buttonText: { fontSize: 15, fontWeight: '800' },
});
