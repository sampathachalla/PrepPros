import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PROFILE_MENU_ITEMS } from '../constants/profile';
import type { ProfileColors } from '../hooks/useProfileColors';
import { ProfileMenuRow } from './ProfileMenuRow';

interface ProfileMenuSectionProps {
  title: string;
  colors: ProfileColors;
  isDarkMode: boolean;
  mealReminders: boolean;
  showPrepTips: boolean;
  onToggleDarkMode: () => void;
  onToggleMealReminders: (value: boolean) => void;
  onTogglePrepTips: (value: boolean) => void;
  onAbout: () => void;
}

export function ProfileMenuSection({
  title,
  colors,
  isDarkMode,
  mealReminders,
  showPrepTips,
  onToggleDarkMode,
  onToggleMealReminders,
  onTogglePrepTips,
  onAbout,
}: ProfileMenuSectionProps) {
  const toggleHandlers: Record<string, { value: boolean; onChange: (v: boolean) => void }> = {
    appearance: { value: isDarkMode, onChange: () => onToggleDarkMode() },
    meal_reminders: { value: mealReminders, onChange: onToggleMealReminders },
    prep_tips: { value: showPrepTips, onChange: onTogglePrepTips },
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {PROFILE_MENU_ITEMS.map((item, index) => {
          const toggle = toggleHandlers[item.id];
          return (
            <ProfileMenuRow
              key={item.id}
              item={item}
              colors={colors}
              value={toggle?.value}
              onToggle={
                item.type === 'toggle' && toggle
                  ? (next) => {
                      if (item.id === 'appearance') {
                        if (next !== isDarkMode) onToggleDarkMode();
                      } else {
                        toggle.onChange(next);
                      }
                    }
                  : undefined
              }
              onPress={item.id === 'help' ? onAbout : undefined}
              isLast={index === PROFILE_MENU_ITEMS.length - 1}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
  },
});
