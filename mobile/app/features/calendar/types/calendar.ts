import type { HouseholdPerson } from '../../household/types/household';

export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export type HouseholdMember = HouseholdPerson & { avatarUrl?: string };

/** draft: only the admin sees it. open: the timer is running. fixed: the plan is final. */
export type MealDayStatus = 'draft' | 'open' | 'fixed';

/** pending and declined apply to members' suggestions. */
export type DishStatus = 'approved' | 'pending' | 'declined';

export interface ScheduledDish {
  id: string;
  name: string;
  category: MealCategory;
  date: string; // YYYY-MM-DD
  notes?: string;
  imageUrl?: string;
  prepMinutes?: number;
  cookMinutes?: number;
  isSuggestion: boolean;
  status: DishStatus;
  addedById?: string;
  /** Who chose this dish for the meal. */
  memberIds: string[];
  createdAt: string;
}

export type CategoryDishes = Record<MealCategory, ScheduledDish[]>;

export interface MealDayState {
  date: string;
  status: MealDayStatus;
  votingEndsAt?: string;
}

export interface MealCategoryConfig {
  key: MealCategory;
  label: string;
  subtitle: string;
}

/** A dish comes from one place: a recipe, a saved link, an earlier dish, or a typed name. */
export interface AddDishPayload {
  date: string;
  category: MealCategory;
  name?: string;
  recipeId?: string;
  bookmarkId?: string;
  fromDishId?: string;
  notes?: string;
}

export interface DishOption {
  key: string;
  name: string;
  imageUrl?: string;
  minutes?: number;
  recipeId?: string;
  bookmarkId?: string;
  fromDishId?: string;
  reason?: string;
}

export interface DishOptions {
  recentlySaved: DishOption[];
  liked: DishOption[];
  suggested: DishOption[];
}

export interface CalendarResponse {
  serverTime: string;
  days: MealDayState[];
  dishes: ScheduledDish[];
}

export type DishActionResult = { success: boolean; error?: string };
