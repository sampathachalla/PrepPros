import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AppTheme, AppThemeDark, Brand } from '@/constants/Colors';
import { useThemeContext } from '@/context/ThemeContext';

interface TabSwitchProps<Key extends string> {
  tabs: readonly { key: Key; label: string; icon: LucideIcon }[];
  selected: Key;
  onSelect: (key: Key) => void;
}

/** Two or more views sharing one page. */
export function TabSwitch<Key extends string>({ tabs, selected, onSelect }: TabSwitchProps<Key>) {
  const { theme } = useThemeContext();
  const palette = theme === 'dark' ? AppThemeDark : AppTheme;

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.track, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      {tabs.map(({ key, label, icon: Icon }) => {
        const isSelected = selected === key;
        return (
          <TouchableOpacity
            key={key}
            onPress={() => onSelect(key)}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            style={[styles.tab, isSelected && { backgroundColor: Brand.babyPink }]}
          >
            <Icon size={15} color={isSelected ? Brand.black : palette.textMuted} />
            <Text style={[styles.label, { color: isSelected ? Brand.black : palette.textMuted }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, padding: 3, marginHorizontal: 16, marginTop: 10 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 11, paddingVertical: 8 },
  label: { fontSize: 13, fontWeight: '800' },
});
