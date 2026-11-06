import type { PrepStatus } from '../types/mealPrep';

export const MEAL_PREP_POLL_INTERVAL_MS = 30_000;

export const PREP_STATUS_LABELS: Record<PrepStatus, string> = {
  todo: 'To do',
  in_progress: 'Cooking',
  done: 'Done',
};

export const PREP_ACTION_LABELS: Record<PrepStatus, string> = {
  todo: 'Start cooking',
  in_progress: 'Mark done',
  done: 'Undo',
};
