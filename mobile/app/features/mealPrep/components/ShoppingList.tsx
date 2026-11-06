import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useCalendarColors } from '../../calendar/hooks/useCalendarColors';
import type { ShoppingItem } from '../types/mealPrep';
import { shoppingItemDishes } from '../utils/prepUtils';

interface ShoppingListProps {
  items: ShoppingItem[];
  progress: { total: number; bought: number };
  onToggle: (key: string) => void;
}

/** Everything the week's dishes need. Ticks are shared by the whole household. */
export function ShoppingList({ items, progress, onToggle }: ShoppingListProps) {
  const colors = useCalendarColors();

  if (items.length === 0) {
    return (
      <Text style={[styles.empty, { color: colors.textMuted }]}>
        The fixed dishes have no ingredient lists. Dishes added from recipes or saved links fill this in.
      </Text>
    );
  }

  return (
    <View>
      <Text style={[styles.progress, { color: colors.textMuted }]}>
        {progress.bought} of {progress.total} bought
      </Text>
      {items.map((item) => (
        <TouchableOpacity
          key={item.key}
          onPress={() => onToggle(item.key)}
          activeOpacity={0.7}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.checked }}
          accessibilityLabel={item.name}
          style={[styles.row, { borderBottomColor: colors.gridLine }]}
        >
          <View
            style={[
              styles.checkbox,
              { borderColor: colors.primary },
              item.checked && { backgroundColor: colors.primary },
            ]}
          >
            {item.checked ? <Check size={13} color={colors.onPrimary} strokeWidth={3.5} /> : null}
          </View>
          <View style={styles.text}>
            <Text
              style={[styles.name, { color: item.checked ? colors.textMuted : colors.text }, item.checked && styles.bought]}
            >
              {item.name}
            </Text>
            <Text style={[styles.dishes, { color: colors.textMuted }]} numberOfLines={2}>
              {shoppingItemDishes(item)}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: 14, lineHeight: 20, textAlign: 'center', paddingVertical: 32, paddingHorizontal: 12 },
  progress: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  bought: { textDecorationLine: 'line-through' },
  dishes: { fontSize: 11, marginTop: 2 },
});
