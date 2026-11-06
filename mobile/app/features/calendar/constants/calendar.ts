import { Brand } from '@/constants/Colors';
import type { MealCategory, MealCategoryConfig } from '../types/calendar';

export const MEAL_CATEGORIES: MealCategoryConfig[] = [
  {
    key: 'breakfast',
    label: 'Breakfast',
    subtitle: 'Start your morning with fresh fuel',
  },
  {
    key: 'lunch',
    label: 'Lunch',
    subtitle: 'Midday balanced plate',
  },
  {
    key: 'snacks',
    label: 'Snacks',
    subtitle: 'Quick bites and sustained energy',
  },
  {
    key: 'dinner',
    label: 'Dinner',
    subtitle: 'Hearty evening meal prep',
  },
];

/**
 * Chip colors for each meal type, kept to the brand's baby pink & baby blue.
 * Meals alternate pink / blue, with a deeper shade for dinner & snacks so all four stay distinct.
 */
export const MEAL_CATEGORY_COLORS: Record<MealCategory, string> = {
  breakfast: Brand.babyPink,
  lunch: Brand.babyBlue,
  dinner: '#EE93AF', // deeper baby pink
  snacks: '#7CC8EC', // deeper baby blue
};

/** How many full weeks ahead of this week users can navigate and plan meals. */
export const MAX_WEEKS_AHEAD_OF_TODAY = 3;

/** How often the calendar checks for other people's answers while it is on screen. */
export const CALENDAR_POLL_INTERVAL_MS = 15_000;

/** How often the calendar checks whether the date has changed. */
export const TODAY_CHECK_INTERVAL_MS = 60_000;

export const TIMER_DURATIONS: { minutes: number; label: string }[] = [
  { minutes: 60, label: '1 hour' },
  { minutes: 180, label: '3 hours' },
  { minutes: 360, label: '6 hours' },
  { minutes: 720, label: '12 hours' },
  { minutes: 1440, label: '1 day' },
  { minutes: 2880, label: '2 days' },
];

export const DEFAULT_TIMER_MINUTES = 720;
