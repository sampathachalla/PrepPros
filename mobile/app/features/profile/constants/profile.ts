import type { ProfileMenuItem, ProfilePreferences } from '../types/profile';

export const PROFILE_STORAGE_KEY = 'preppros_profile_prefs_v1';

export const DEFAULT_PROFILE_PREFERENCES: ProfilePreferences = {
  mealReminders: true,
  showPrepTips: true,
};

export const PROFILE_COPY = {
  tagline: 'Your meal prep hub — plan, cook, and stay on track.',
  statsTitle: 'Your prep snapshot',
  preferencesTitle: 'Preferences',
  accountTitle: 'Account',
  logout: 'Log Out',
  logoutConfirm: 'Sign out of PrepPros on this device?',
  roleAdmin: 'Household admin',
  roleMember: 'Household member',
  helpMessage:
    'PrepPros helps your household plan meals together, then builds your cooking and shopping list for the week.',
} as const;

export const PROFILE_MENU_ITEMS: ProfileMenuItem[] = [
  {
    id: 'appearance',
    title: 'Dark mode',
    subtitle: 'Switch light and dark theme',
    type: 'toggle',
  },
  {
    id: 'meal_reminders',
    title: 'Meal reminders',
    subtitle: 'Get nudges before prep cutoff times',
    type: 'toggle',
  },
  {
    id: 'prep_tips',
    title: 'Prep tips',
    subtitle: 'Show helpful hints on the calendar',
    type: 'toggle',
  },
  {
    id: 'help',
    title: 'About PrepPros',
    subtitle: 'What this app does',
    type: 'action',
  },
];

export const STAT_LABELS: Record<
  import('../types/profile').ProfileStatKey,
  string
> = {
  mealsPlanned: 'Meals planned',
  recipesSaved: 'Recipes',
  bookmarks: 'Bookmarks',
};
