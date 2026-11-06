import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { ProfileMenuItem } from '../types/profile';
import type { ProfileColors } from '../hooks/useProfileColors';

interface ProfileMenuRowProps {
  item: ProfileMenuItem;
  colors: ProfileColors;
  value?: boolean;
  onToggle?: (next: boolean) => void;
  onPress?: () => void;
  isLast?: boolean;
}

export function ProfileMenuRow({
  item,
  colors,
  value = false,
  onToggle,
  onPress,
  isLast = false,
}: ProfileMenuRowProps) {
  const isToggle = item.type === 'toggle';

  const content = (
    <>
      <View style={styles.textBlock}>
        <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
        {item.subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{item.subtitle}</Text>
        ) : null}
      </View>

      {isToggle ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: `${colors.secondary}99` }}
          thumbColor={value ? colors.primary : colors.card}
        />
      ) : (
        <ChevronRight size={18} color={colors.textMuted} />
      )}
    </>
  );

  if (isToggle) {
    return (
      <View
        style={[
          styles.row,
          !isLast && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
        ]}
      >
        {content}
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.row,
        !isLast && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  textBlock: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
});
