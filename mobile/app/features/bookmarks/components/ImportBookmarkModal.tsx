import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { X, PlaySquare, AlertCircle, Link2 } from 'lucide-react-native';
import { InstagramIcon } from './InstagramIcon';
import { Brand, AppTheme, AppThemeDark } from '@/constants/Colors';
import { useThemeContext } from '@/context/ThemeContext';
import { detectPlatformFromUrl } from '../validators/bookmarkValidators';
import type { ImportBookmarkInput } from '../types/bookmarks';

interface ImportBookmarkModalProps {
  visible: boolean;
  onClose: () => void;
  onImport: (input: ImportBookmarkInput) => Promise<{ success: boolean; error?: string }>;
}

export function ImportBookmarkModal({ visible, onClose, onImport }: ImportBookmarkModalProps) {
  const { theme } = useThemeContext();
  const isDark = theme === 'dark';
  const palette = isDark ? AppThemeDark : AppTheme;

  const [url, setUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Provider is detected from the link, never picked manually
  const provider = detectPlatformFromUrl(url);

  const handleUrlChange = (newUrl: string) => {
    // Multiline is only for wrapping long links; never keep line breaks
    setUrl(newUrl.replace(/\n/g, ''));
    setErrorMessage(null);
  };

  const resetForm = () => {
    setUrl('');
    setErrorMessage(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = async () => {
    if (isSaving) return;

    if (!url.trim()) {
      setErrorMessage('Please paste an Instagram or YouTube link');
      return;
    }

    if (provider === 'unknown') {
      setErrorMessage('Please provide a valid Instagram or YouTube URL');
      return;
    }

    setIsSaving(true);
    const result = await onImport({ url: url.trim(), source: provider });
    setIsSaving(false);

    if (!result.success && result.error) {
      setErrorMessage(result.error);
    } else {
      resetForm();
    }
  };

  const isDetected = provider !== 'unknown';
  const showUnsupportedHint = url.trim().length > 0 && !isDetected;

  const renderProviderBadge = () =>
    provider === 'instagram' ? (
      <View style={[styles.providerBadge, { backgroundColor: 'rgba(225, 48, 108, 0.15)' }]}>
        <InstagramIcon size={16} color="#E1306C" />
        <Text style={[styles.providerText, { color: '#E1306C' }]}>Instagram</Text>
      </View>
    ) : (
      <View style={[styles.providerBadge, { backgroundColor: 'rgba(255, 0, 0, 0.15)' }]}>
        <PlaySquare size={16} color="#FF0000" />
        <Text style={[styles.providerText, { color: '#FF0000' }]}>YouTube</Text>
      </View>
    );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <TouchableOpacity activeOpacity={1} onPress={handleClose} style={styles.backdrop} />

        <View
          style={[
            styles.sheet,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: palette.border }]}>
            <View>
              <Text style={[styles.title, { color: palette.text }]}>Import Recipe Link</Text>
              <Text style={[styles.subtitle, { color: palette.textMuted }]}>
                Save from Instagram Reels or YouTube
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleClose}
              style={[styles.closeButton, { backgroundColor: isDark ? '#262626' : '#F0F0F0' }]}
            >
              <X size={18} color={palette.text} />
            </TouchableOpacity>
          </View>

          {/* Error Message */}
          {errorMessage ? (
            <View style={[styles.errorBox, { backgroundColor: 'rgba(239, 83, 80, 0.1)' }]}>
              <AlertCircle size={16} color={palette.error} />
              <Text style={[styles.errorText, { color: palette.error }]}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Link Field */}
          <View style={styles.field}>
            <View style={styles.fieldLabelRow}>
              <Link2 size={14} color={palette.textMuted} />
              <Text style={[styles.fieldLabel, { color: palette.text }]}>Link</Text>
            </View>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: isDetected ? Brand.babyPink : palette.border,
                  backgroundColor: isDark ? '#1C1C1E' : '#F9F9F9',
                  color: palette.text,
                },
              ]}
              placeholder="Paste an Instagram Reel or YouTube link"
              placeholderTextColor={palette.textMuted}
              value={url}
              onChangeText={handleUrlChange}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              multiline
              autoFocus
            />

            {showUnsupportedHint && (
              <Text style={[styles.hintText, { color: palette.textMuted }]}>
                Only Instagram and YouTube links are supported
              </Text>
            )}
          </View>

          {/* Provider + Save, shown once the link is recognised */}
          {isDetected && (
            <View style={styles.detectedRow}>
              {renderProviderBadge()}

              <TouchableOpacity
                onPress={handleSave}
                activeOpacity={0.85}
                disabled={isSaving}
                style={[styles.submitButton, { backgroundColor: Brand.babyPink }]}
                accessibilityState={{ busy: isSaving, disabled: isSaving }}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={Brand.black} />
                ) : (
                  <Text style={styles.submitButtonText}>Save to Bookmarks</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  field: {
    marginBottom: 14,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    minHeight: 110,
    fontSize: 15,
    lineHeight: 21,
    textAlignVertical: 'top',
  },
  hintText: {
    fontSize: 12,
    marginTop: 8,
  },
  detectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
  },
  providerText: {
    fontSize: 14,
    fontWeight: '700',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: Brand.black,
    fontSize: 15,
    fontWeight: '800',
  },
});
