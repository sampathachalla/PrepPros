import type { MealCategory } from '../../calendar/types/calendar';

export type PrepStatus = 'todo' | 'in_progress' | 'done';

export interface PrepDish {
  id: string;
  date: string;
  meal: MealCategory;
  name: string;
  imageUrl?: string;
  notes?: string;
  /** One per person eating it. */
  servings: number;
  /** How many the source recipe makes. */
  baseServings?: number;
  memberIds: string[];
  prepMinutes?: number;
  cookMinutes?: number;
  ingredients: string[];
  steps: string[];
  prepStatus: PrepStatus;
  assigneeId?: string;
}

export interface ShoppingItem {
  key: string;
  name: string;
  dishes: { name: string; servings: number }[];
  checked: boolean;
}

export interface MealPrepPlan {
  weekStart: string;
  dishes: PrepDish[];
  shopping: ShoppingItem[];
  fixedDayCount: number;
  undecidedDayCount: number;
}

export type MealPrepView = 'cook' | 'shop';
