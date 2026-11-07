import type {
  DishOption,
  DishOptions,
  MealDayState,
  PickerItem,
  PickerItemState,
  PickerSection,
  ScheduledDish,
} from '../types/calendar';

/** A timer past its end counts as over at once, without waiting for the next reload. */
export function isTimerRunning(day: MealDayState | undefined, nowMs: number): boolean {
  return day?.status === 'open' && !!day.votingEndsAt && new Date(day.votingEndsAt).getTime() > nowMs;
}

export function isDayFixed(day: MealDayState | undefined, nowMs: number): boolean {
  return day?.status === 'fixed' || (day?.status === 'open' && !isTimerRunning(day, nowMs));
}

/** The dish this person put on a meal. A declined dish doesn't count. */
export const findOwnDish = (dishes: ScheduledDish[], myId: string) =>
  dishes.filter((dish) => dish.addedById === myId && dish.status !== 'declined').at(-1);

/** What the person may do with a day. The server enforces all of this; this only decides what to show. */
export function dayPermissions(day: MealDayState | undefined, isAdmin: boolean, isPast: boolean, nowMs: number) {
  const running = isTimerRunning(day, nowMs);
  const fixed = isDayFixed(day, nowMs);
  return {
    canEditPlan: isAdmin && !isPast && !fixed,
    canSuggest: !isAdmin && !isPast && !fixed,
    canAnswer: running,
    canDecide: isAdmin && !fixed,
    canStartTimer: isAdmin && !isPast && !running,
    canEndTimer: isAdmin && running,
  };
}

/** e.g. "2d 4h left", "3h 12m left", "12m left", "45s left". */
export function formatTimeLeft(endsAt: string, nowMs: number): string {
  const totalSeconds = Math.max(0, Math.floor((new Date(endsAt).getTime() - nowMs) / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m left`;
  return `${totalSeconds}s left`;
}

export function filterDishOptions<T extends { name: string }>(options: T[], query: string): T[] {
  const normalized = query.trim().toLowerCase();
  return normalized ? options.filter((option) => option.name.toLowerCase().includes(normalized)) : options;
}

interface PickerSectionsInput {
  options: DishOptions;
  householdDishes?: ScheduledDish[];
  memberCount?: number;
  myId?: string;
  canAnswer?: boolean;
}

function householdItemState(dish: ScheduledDish, myId: string, canAnswer: boolean): PickerItemState {
  if (dish.status === 'pending') return 'waiting';
  if (!canAnswer) return 'onPlan';
  return dish.memberIds.includes(myId) ? 'selected' : 'select';
}

/**
 * The picker's sections, most relevant first. A dish shows once, in the first section that has it, and
 * names are compared the way the server spots duplicates. A section with no dishes is left out.
 */
export function buildPickerSections({
  options,
  householdDishes = [],
  memberCount = 0,
  myId = '',
  canAnswer = false,
}: PickerSectionsInput): PickerSection[] {
  const toHouseholdItem = (dish: ScheduledDish): PickerItem => ({
    key: `planned:${dish.id}`,
    name: dish.name,
    minutes: (dish.prepMinutes ?? 0) + (dish.cookMinutes ?? 0) || undefined,
    reason: memberCount > 0 ? `${dish.memberIds.length} of ${memberCount}` : undefined,
    state: householdItemState(dish, myId, canAnswer),
    dish,
  });
  const toOptionItem = (option: DishOption): PickerItem => ({
    key: option.key,
    name: option.name,
    minutes: option.minutes,
    reason: option.reason,
    state: 'suggest',
    option,
  });

  const seen = new Set<string>();
  const isFirstSighting = ({ key, name }: PickerItem) => {
    const marks = [key, name.trim().toLowerCase()];
    const isNew = !marks.some((mark) => seen.has(mark));
    marks.forEach((mark) => seen.add(mark));
    return isNew;
  };

  const sections: PickerSection[] = [
    {
      key: 'household',
      title: 'Household picks',
      items: householdDishes.filter(({ status }) => status !== 'declined').map(toHouseholdItem),
    },
    { key: 'liked', title: 'Liked', items: options.liked.map(toOptionItem) },
    { key: 'new', title: 'Newly added', items: options.recentlySaved.map(toOptionItem) },
    { key: 'possible', title: 'Possible dishes', items: options.suggested.map(toOptionItem) },
  ];

  return sections
    .map((section) => ({ ...section, items: section.items.filter(isFirstSighting) }))
    .filter(({ items }) => items.length > 0);
}
