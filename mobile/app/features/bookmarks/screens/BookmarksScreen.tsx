import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppTheme, AppThemeDark } from '@/constants/Colors';
import { useThemeContext } from '@/context/ThemeContext';
import { useScreenHeader } from '@/app/shared';
import RecipesScreen from '../../recipes/screens/RecipesScreen';
import { BookmarksTabSwitch, type BookmarksTab } from '../components/BookmarksTabSwitch';
import { SavedBookmarksView } from '../components/SavedBookmarksView';

/** One page for everything to cook from: saved links on one side, the recipe catalog on the other. */
export default function BookmarksScreen() {
  const { theme } = useThemeContext();
  const palette = theme === 'dark' ? AppThemeDark : AppTheme;
  const [tab, setTab] = useState<BookmarksTab>('saved');
  useScreenHeader({ title: tab === 'saved' ? 'Saved' : 'Recipes' });

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <BookmarksTabSwitch selected={tab} onSelect={setTab} />
      <View style={styles.content}>{tab === 'saved' ? <SavedBookmarksView /> : <RecipesScreen />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1 },
});
