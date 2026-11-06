export type ProfileStatKey = 'mealsPlanned' | 'recipesSaved' | 'bookmarks';

export type ProfileStat = {
  key: ProfileStatKey;
  label: string;
  value: number;
};

export type ProfilePreferences = {
  mealReminders: boolean;
  showPrepTips: boolean;
};

export type ProfileMenuItemId =
  | 'appearance'
  | 'meal_reminders'
  | 'prep_tips'
  | 'help';

export type ProfileMenuItem = {
  id: ProfileMenuItemId;
  title: string;
  subtitle?: string;
  type: 'toggle' | 'action';
};
