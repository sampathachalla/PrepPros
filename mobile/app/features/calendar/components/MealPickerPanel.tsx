import React, { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Bookmark, Heart, Plus, Search, Sparkles } from 'lucide-react-native';
import { useCalendarColors } from '../hooks/useCalendarColors';
import { useDishOptions } from '../hooks/useDishOptions';
import { filterDishOptions } from '../utils/dayPlanUtils';
import type { DishActionResult, DishOption, DishOptions, MealCategory } from '../types/calendar';

type MealPickTab = keyof DishOptions;

interface MealPickerPanelProps {
  category: MealCategory;
  onPick: (option: DishOption | { name: string }) => Promise<DishActionResult>;
}

const TABS: { key: MealPickTab; label: string; icon: typeof Sparkles; empty: string }[] = [
  { key: 'recentlySaved', label: 'Recently saved', icon: Bookmark, empty: 'Links you save in Bookmarks show up here' },
  { key: 'liked', label: 'Liked', icon: Heart, empty: 'Recipes you like show up here' },
  { key: 'suggested', label: 'Suggested', icon: Sparkles, empty: 'No suggestions for this meal yet' },
];

const CARD_WIDTH = 152;

/** Choose a dish from what you've saved or liked, from suggestions, or type one in. */
export function MealPickerPanel({ category, onPick }: MealPickerPanelProps) {
  const colors = useCalendarColors();
  const { options, isLoading, error: loadError } = useDishOptions(category);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<MealPickTab>('recentlySaved');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searching = query.trim().length > 0;
  const uniqueOptions = [...options.recentlySaved, ...options.liked, ...options.suggested].filter(
    (option, index, all) => all.findIndex(({ key }) => key === option.key) === index,
  );
  const items = searching ? filterDishOptions(uniqueOptions, query) : options[activeTab];
  const activeEmpty = TABS.find((tab) => tab.key === activeTab)?.empty;

  const pick = async (key: string, option: DishOption | { name: string }) => {
    if (savingKey) return;
    setSavingKey(key);
    setError(null);
    const result = await onPick(option);
    setSavingKey(null);
    if (!result.success) setError(result.error ?? 'Could not add this dish.');
  };

  return (
    <View style={styles.panel}>
      <View style={styles.searchRow}>
        <Search size={14} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setError(null);
          }}
          placeholder="Search, or type a dish name"
          placeholderTextColor={colors.textMuted}
          maxLength={150}
          style={[
            styles.input,
            { borderColor: colors.border, backgroundColor: colors.inputBackground, color: colors.text },
          ]}
        />
      </View>

      {searching ? null : (
        <View style={styles.tabRow}>
          {TABS.map(({ key, label, icon: Icon }) => {
            const selected = activeTab === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setActiveTab(key)}
                activeOpacity={0.75}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: selected ? colors.primarySoft : colors.inputBackground,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Icon size={12} color={selected ? colors.primary : colors.textMuted} />
                <Text style={[styles.tabText, { color: selected ? colors.text : colors.textMuted }]} numberOfLines={1}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loading} accessibilityLabel="Loading dishes" />
      ) : items.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {loadError ?? (searching ? 'Nothing saved matches that' : activeEmpty)}
        </Text>
      ) : (
        <FlatList
          horizontal
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          data={items}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => pick(item.key, item)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Add ${item.name}`}
              style={[styles.card, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
            >
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={3}>
                {item.name}
              </Text>
              {item.reason || item.minutes ? (
                <Text style={[styles.cardMeta, { color: colors.textMuted }]} numberOfLines={1}>
                  {[item.minutes ? `${item.minutes}m` : null, item.reason].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
              {savingKey === item.key ? (
                <ActivityIndicator size="small" color={colors.primary} style={styles.cardSpinner} />
              ) : (
                <Text style={[styles.cardAction, { color: colors.primary }]}>+ Add</Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      {query.trim().length >= 2 ? (
        <TouchableOpacity
          onPress={() => pick('typed', { name: query.trim() })}
          style={[styles.typedButton, { borderColor: colors.primary }]}
          accessibilityRole="button"
        >
          <Plus size={13} color={colors.primary} />
          <Text style={[styles.typedText, { color: colors.text }]} numberOfLines={1}>
            Add “{query.trim()}”
          </Text>
        </TouchableOpacity>
      ) : null}

      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginBottom: 10 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  input: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
  tabRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  tabChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderRadius: 10, paddingVertical: 7, paddingHorizontal: 4 },
  tabText: { fontSize: 11, fontWeight: '700', flexShrink: 1 },
  loading: { paddingVertical: 20 },
  emptyText: { fontSize: 12, textAlign: 'center', paddingVertical: 16 },
  carousel: { gap: 8, paddingVertical: 2 },
  card: { width: CARD_WIDTH, minHeight: 104, borderWidth: 1, borderRadius: 12, padding: 10, justifyContent: 'space-between' },
  cardTitle: { fontSize: 13, fontWeight: '700' },
  cardMeta: { fontSize: 10, marginTop: 4 },
  cardAction: { fontSize: 12, fontWeight: '800', marginTop: 6 },
  cardSpinner: { alignSelf: 'flex-start', marginTop: 6 },
  typedButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, marginTop: 8 },
  typedText: { flex: 1, fontSize: 13, fontWeight: '700' },
  error: { fontSize: 12, fontWeight: '600', marginTop: 8 },
});
