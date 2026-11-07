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
  recipeId?: string;
  bookmarkId?: string;
  baseServings?: number;
  ingredients?: string[];
  steps?: string[];
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
  replacesDishId?: string;
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

/** suggest: not on the meal yet. select, selected, onPlan and waiting: already on the meal. */
export type PickerItemState = 'suggest' | 'select' | 'selected' | 'onPlan' | 'waiting';

/** One card in the meal picker. Exactly one of `option` or `dish` is set. */
export interface PickerItem {
  key: string;
  name: string;
  minutes?: number;
  reason?: string;
  state: PickerItemState;
  option?: DishOption;
  dish?: ScheduledDish;
}

export interface PickerSection {
  key: 'household' | 'liked' | 'new' | 'possible';
  title: string;
  items: PickerItem[];
}

export interface CalendarResponse {
  serverTime: string;
  days: MealDayState[];
  dishes: ScheduledDish[];
}

export type DishActionResult = { success: boolean; error?: string };
