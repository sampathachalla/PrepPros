import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AppTheme, AppThemeDark, Brand } from '@/constants/Colors';
import { useThemeContext } from '@/context/ThemeContext';

interface NoticeBannerProps {
  icon: LucideIcon;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** A one-line message for the top of a page: a prompt, an announcement or a promotion. */
export function NoticeBanner({ icon: Icon, message, actionLabel, onAction }: NoticeBannerProps) {
  const { theme } = useThemeContext();
  const palette = theme === 'dark' ? AppThemeDark : AppTheme;

  return (
    <View style={[styles.banner, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Icon size={16} color={palette.text} />
      <Text style={[styles.message, { color: palette.text }]} numberOfLines={2}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} style={styles.action} accessibilityRole="button">
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    marginHorizontal: 12,
    marginTop: 12,
  },
  message: { flex: 1, fontSize: 12, fontWeight: '700' },
  action: { backgroundColor: Brand.babyPink, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 },
  actionText: { color: Brand.black, fontSize: 12, fontWeight: '800' },
});
