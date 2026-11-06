import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CookingPot } from 'lucide-react-native';
import { useCalendarColors } from '../../calendar/hooks/useCalendarColors';

interface PrepEmptyStateProps {
  title: string;
  message: string;
  /** Without a household, the next step is making one rather than planning. */
  needsHousehold?: boolean;
}

/** Points to the calendar, where meal prep comes from, or to starting a household first. */
export function PrepEmptyState({ title, message, needsHousehold = false }: PrepEmptyStateProps) {
  const colors = useCalendarColors();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={[styles.iconBubble, { backgroundColor: colors.primarySoft }]}>
        <CookingPot size={30} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
      <TouchableOpacity
        onPress={() =>
          needsHousehold
            ? router.navigate({ pathname: '/(tabs)/profile', params: { view: 'people' } })
            : router.setParams({ view: 'calendar' })
        }
        style={[styles.button, { backgroundColor: colors.primary }]}
        accessibilityRole="button"
      >
        <Text style={[styles.buttonText, { color: colors.onPrimary }]}>{needsHousehold ? 'Get started' : 'Go to Calendar'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingHorizontal: 28, paddingTop: 56 },
  iconBubble: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 19, fontWeight: '800', textAlign: 'center' },
  message: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 6, marginBottom: 18 },
  button: { borderRadius: 13, paddingHorizontal: 22, paddingVertical: 12 },
  buttonText: { fontSize: 15, fontWeight: '800' },
});
