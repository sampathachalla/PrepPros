import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Check, Pencil, X } from 'lucide-react-native';
import { ApiError } from '@/app/shared/services/apiClient';
import { useHouseholdColors } from '../hooks/useHouseholdColors';

interface HouseholdNameHeaderProps {
  name: string;
  memberCount: number;
  maxMembers: number;
  canRename: boolean;
  onRename: (name: string) => Promise<void>;
}

/** The household's name and size; the admin can rename it in place. */
export function HouseholdNameHeader({ name, memberCount, maxMembers, canRename, onRename }: HouseholdNameHeaderProps) {
  const colors = useHouseholdColors();
  const [draft, setDraft] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancel = () => {
    setDraft(null);
    setError(null);
  };

  const save = async () => {
    const next = draft?.trim() ?? '';
    if (next === name) return cancel();
    setIsSaving(true);
    setError(null);
    try {
      await onRename(next);
      setDraft(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not rename the household.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {draft === null ? (
        <View style={styles.row}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
            {name}
          </Text>
          {canRename ? (
            <TouchableOpacity
              onPress={() => setDraft(name)}
              hitSlop={10}
              accessibilityLabel="Edit household name"
              accessibilityRole="button"
            >
              <Pencil size={17} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <View style={styles.row}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            autoFocus
            maxLength={60}
            editable={!isSaving}
            placeholder="Household name"
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            onSubmitEditing={save}
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
          />
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <TouchableOpacity onPress={save} hitSlop={8} accessibilityLabel="Save name" accessibilityRole="button">
                <Check size={21} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={cancel} hitSlop={8} accessibilityLabel="Cancel" accessibilityRole="button">
                <X size={21} color={colors.textMuted} />
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
      <Text style={[styles.count, { color: colors.textMuted }]}>
        {memberCount} of {maxMembers} people
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { flexShrink: 1, fontSize: 24, fontWeight: '800' },
  input: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, fontSize: 16, fontWeight: '700' },
  error: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  count: { fontSize: 13, marginTop: 2 },
});
