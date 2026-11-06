import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { UserPlus } from 'lucide-react-native';
import { ApiError } from '@/app/shared/services/apiClient';
import { useHouseholdColors } from '../hooks/useHouseholdColors';

interface AddMemberFormProps {
  isFull: boolean;
  onAdd: (email: string) => Promise<void>;
}

/** The admin adds someone who already has a PrepPros account, by their email. */
export function AddMemberForm({ isFull, onAdd }: AddMemberFormProps) {
  const colors = useHouseholdColors();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setIsOpen(false);
    setEmail('');
    setError(null);
  };

  const add = async () => {
    const address = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) {
      setError('Enter a valid email address.');
      return;
    }
    setIsAdding(true);
    setError(null);
    try {
      await onAdd(address);
      close();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not add this person. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  if (isFull) {
    return (
      <Text style={[styles.fullText, { color: colors.textMuted }]}>
        This household is full. Remove someone to add another person.
      </Text>
    );
  }

  if (!isOpen) {
    return (
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        style={[styles.button, { backgroundColor: colors.primary }]}
        accessibilityRole="button"
      >
        <UserPlus size={16} color={colors.onPrimary} />
        <Text style={[styles.buttonText, { color: colors.onPrimary }]}>Add people</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.form}>
      <Text style={[styles.label, { color: colors.text }]}>Their PrepPros email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        editable={!isAdding}
        placeholder="name@example.com"
        placeholderTextColor={colors.textMuted}
        returnKeyType="done"
        onSubmitEditing={add}
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.inputBackground, color: colors.text }]}
      />
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={close}
          disabled={isAdding}
          style={[styles.actionButton, { borderColor: colors.border, borderWidth: 1 }]}
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={add}
          disabled={isAdding}
          style={[styles.actionButton, { backgroundColor: colors.primary, opacity: isAdding ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityState={{ busy: isAdding }}
        >
          {isAdding ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.onPrimary }]}>Add</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullText: { fontSize: 12, lineHeight: 17, marginTop: 12 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 13, marginTop: 14 },
  buttonText: { fontSize: 15, fontWeight: '800' },
  form: { marginTop: 14 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  error: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionButton: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 12, minHeight: 46 },
});
