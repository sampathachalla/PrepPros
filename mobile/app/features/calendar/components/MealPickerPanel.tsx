import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Plus, Search, Sparkles } from 'lucide-react-native';
import { useCalendarColors } from '../hooks/useCalendarColors';
import { useDishOptions } from '../hooks/useDishOptions';
import { buildPickerSections, filterDishOptions } from '../utils/dayPlanUtils';
import type {
  DishActionResult,
  DishOption,
  MealCategory,
  PickerItem,
  PickerItemState,
  ScheduledDish,
} from '../types/calendar';

type MealPickTab = 'forYou' | 'search';

interface MealPickerPanelProps {
  category: MealCategory;
  onPick: (option: DishOption | { name: string }) => Promise<DishActionResult>;
  /** What's already on this meal. Left out where the household's picks don't apply. */
  householdDishes?: ScheduledDish[];
  memberCount?: number;
  myId?: string;
  canAnswer?: boolean;
  onToggleChoice?: (dish: ScheduledDish) => Promise<DishActionResult>;
  /** Picking swaps your dish on this meal instead of adding another. */
  replacing?: boolean;
}

const TABS: { key: MealPickTab; label: string; icon: typeof Sparkles }[] = [
  { key: 'forYou', label: 'For you', icon: Sparkles },
  { key: 'search', label: 'Search', icon: Search },
];

const CARD_ACTIONS: Record<PickerItemState, string> = {
  suggest: '+ Add',
  select: 'Choose',
  selected: 'Chosen',
  onPlan: 'On the plan',
  waiting: 'Waiting for the admin',
};

const COLUMNS = 2;
/** Keeps at least two rows of cards on screen without pushing the sheet off a small phone. */
const LIST_HEIGHT_SHARE = 0.55;

const toRows = (items: PickerItem[]) =>
  Array.from({ length: Math.ceil(items.length / COLUMNS) }, (_, row) =>
    items.slice(row * COLUMNS, (row + 1) * COLUMNS),
  );

/** Choose a dish from the household's picks, what you've liked or saved, or suggestions, or type one in. */
export function MealPickerPanel({
  category,
  onPick,
  householdDishes,
  memberCount,
  myId,
  canAnswer,
  onToggleChoice,
  replacing,
}: MealPickerPanelProps) {
  const colors = useCalendarColors();
  const { height } = useWindowDimensions();
  const { options, isLoading, error: loadError } = useDishOptions(category);
  const [activeTab, setActiveTab] = useState<MealPickTab>('forYou');
  const [query, setQuery] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pickerSections = useMemo(
    () => buildPickerSections({ options, householdDishes, memberCount, myId, canAnswer }),
    [options, householdDishes, memberCount, myId, canAnswer],
  );

  const searching = activeTab === 'search';
  const sections = useMemo(() => {
    if (!searching) {
      return pickerSections.map(({ key, title, items }) => ({ key, title, data: toRows(items) }));
    }
    const allItems = pickerSections.flatMap(({ items }) => items);
    return [{ key: 'results', title: '', data: toRows(filterDishOptions(allItems, query)) }];
  }, [pickerSections, query, searching]);
  const hasItems = sections.some(({ data }) => data.length > 0);
  const typedName = query.trim();
  const typedAction = replacing ? 'Replace with' : 'Add';

  const run = async (key: string, task: () => Promise<DishActionResult>) => {
    if (savingKey) return;
    setSavingKey(key);
    setError(null);
    const result = await task();
    setSavingKey(null);
    if (!result.success) setError(result.error ?? 'Could not add this dish.');
  };

  const pressItem = ({ key, option, dish }: PickerItem) => {
    if (option) void run(key, () => onPick(option));
    else if (dish && onToggleChoice) void run(key, () => onToggleChoice(dish));
  };

  const renderCard = (item: PickerItem) => {
    const inactive = item.state === 'onPlan' || item.state === 'waiting' || (item.dish && !onToggleChoice);
    const meta = [item.minutes ? `${item.minutes}m` : null, item.reason].filter(Boolean).join(' · ');
    const action = replacing && item.state === 'suggest' ? 'Replace' : CARD_ACTIONS[item.state];
    return (
      <TouchableOpacity
        key={item.key}
        onPress={() => pressItem(item)}
        disabled={Boolean(inactive)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityState={{ disabled: Boolean(inactive), selected: item.state === 'selected' }}
        accessibilityLabel={[item.name, meta, action].filter(Boolean).join(', ')}
        style={[
          styles.card,
          {
            borderColor: item.state === 'selected' ? colors.primary : colors.border,
            backgroundColor: colors.inputBackground,
          },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={3}>
          {item.name}
        </Text>
        {meta ? (
          <Text style={[styles.cardMeta, { color: colors.textMuted }]} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
        {savingKey === item.key ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.cardSpinner} />
        ) : (
          <Text
            style={[styles.cardAction, { color: inactive ? colors.textMuted : colors.primary }]}
            numberOfLines={2}
          >
            {action}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.panel}>
      <View style={styles.tabRow} accessibilityRole="tablist">
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

      {searching ? (
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
            returnKeyType="search"
            accessibilityLabel="Search dishes, or type a dish name"
            style={[
              styles.input,
              { borderColor: colors.border, backgroundColor: colors.inputBackground, color: colors.text },
            ]}
          />
        </View>
      ) : null}

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loading} accessibilityLabel="Loading dishes" />
      ) : !hasItems ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {loadError ?? (searching ? 'Nothing saved matches that' : 'Dishes you like or save show up here')}
        </Text>
      ) : (
        <SectionList
          sections={sections}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: height * LIST_HEIGHT_SHARE }}
          keyExtractor={(row) => row.map(({ key }) => key).join('|')}
          renderSectionHeader={({ section }) =>
            section.title ? (
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]} accessibilityRole="header">
                {section.title}
              </Text>
            ) : null
          }
          renderItem={({ item: row }) => (
            <View style={styles.row}>
              {row.map(renderCard)}
              {row.length < COLUMNS ? <View style={styles.cardSpacer} /> : null}
            </View>
          )}
        />
      )}

      {searching && typedName.length >= 2 ? (
        <TouchableOpacity
          onPress={() => void run('typed', () => onPick({ name: typedName }))}
          style={[styles.typedButton, { borderColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel={`${typedAction} ${typedName}`}
        >
          <Plus size={13} color={colors.primary} />
          <Text style={[styles.typedText, { color: colors.text }]} numberOfLines={1}>
            {typedAction} “{typedName}”
          </Text>
        </TouchableOpacity>
      ) : null}

      {error || (hasItems && loadError) ? (
        <Text style={[styles.error, { color: colors.error }]}>{error ?? loadError}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginBottom: 10 },
  tabRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  tabChip: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 4,
  },
  tabText: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  input: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
  loading: { paddingVertical: 20 },
  emptyText: { fontSize: 12, textAlign: 'center', paddingVertical: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '800', marginTop: 4, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  card: { flex: 1, minHeight: 104, borderWidth: 1, borderRadius: 12, padding: 10, justifyContent: 'space-between' },
  cardSpacer: { flex: 1 },
  cardTitle: { fontSize: 13, fontWeight: '700' },
  cardMeta: { fontSize: 10, marginTop: 4 },
  cardAction: { fontSize: 12, fontWeight: '800', marginTop: 6 },
  cardSpinner: { alignSelf: 'flex-start', marginTop: 6 },
  typedButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, marginTop: 8 },
  typedText: { flex: 1, fontSize: 13, fontWeight: '700' },
  error: { fontSize: 12, fontWeight: '600', marginTop: 8 },
});
