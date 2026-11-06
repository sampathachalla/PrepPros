import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { ApiError } from '@/app/shared/services/apiClient';
import { AVATAR_COLOR_OPTIONS } from '../../household/constants/household';
import type { ProfileColors } from '../hooks/useProfileColors';

interface EditProfileModalProps {
  visible: boolean;
  initialName: string;
  initialColor?: string | null;
  colors: ProfileColors;
  onClose: () => void;
  onSave: (changes: { displayName: string; avatarColor?: string }) => Promise<void>;
}

/** The name and avatar colour the household sees. */
export function EditProfileModal({ visible, initialName, initialColor, colors, onClose, onSave }: EditProfileModalProps) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor ?? undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSave({ displayName: name.trim(), avatarColor: color });
      onClose();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not save your profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const initials = name.trim().slice(0, 2).toUpperCase() || '?';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.text }]}>Edit profile</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" hitSlop={10}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={[styles.avatar, { backgroundColor: color ?? colors.secondary }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <Text style={[styles.label, { color: colors.textMuted }]}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            maxLength={40}
            placeholder="Your name"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          />

          <Text style={[styles.label, { color: colors.textMuted }]}>Avatar colour</Text>
          <View style={styles.swatches}>
            {AVATAR_COLOR_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() => setColor(option)}
                accessibilityLabel={`Colour ${option}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: color === option }}
                style={[styles.swatch, { backgroundColor: option }]}
              >
                {color === option ? <Check size={16} color="#111111" strokeWidth={3} /> : null}
              </TouchableOpacity>
            ))}
          </View>

          {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

          <TouchableOpacity
            onPress={save}
            disabled={isSaving || !name.trim()}
            style={[styles.saveButton, { backgroundColor: colors.primary, opacity: name.trim() ? 1 : 0.5 }]}
            accessibilityRole="button"
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Text style={[styles.saveText, { color: colors.onPrimary }]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, paddingBottom: 36 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '800' },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12 },
  avatarText: { fontSize: 24, fontWeight: '800', color: '#111111' },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, marginBottom: 10 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  error: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  saveButton: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  saveText: { fontSize: 16, fontWeight: '800' },
});
