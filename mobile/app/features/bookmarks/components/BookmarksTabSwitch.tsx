import React from 'react';
import { Bookmark, ChefHat } from 'lucide-react-native';
import { TabSwitch } from '@/app/shared/components/ui/TabSwitch';

export type BookmarksTab = 'saved' | 'recipes';

interface BookmarksTabSwitchProps {
  selected: BookmarksTab;
  onSelect: (tab: BookmarksTab) => void;
}

const TABS = [
  { key: 'saved', label: 'Saved', icon: Bookmark },
  { key: 'recipes', label: 'Recipes', icon: ChefHat },
] as const;

export function BookmarksTabSwitch({ selected, onSelect }: BookmarksTabSwitchProps) {
  return <TabSwitch tabs={TABS} selected={selected} onSelect={onSelect} />;
}
