import { addDays, formatDateKey, getTodayDateKey, getWeekDays, parseDateKey } from '../../calendar/utils/dateUtils';
import type {
  BulkAssignAffectedSlot,
  BulkAssignResult,
  BulkAssignStrategy,
  CatalogDish,
  DishCatalogFilter,
  HouseholdMember,
  MealCategory,
  MealProposal,
  PlannerSlotViewModel,
  ProposalDishItem,
  SlotCoord,
} from '../types/mealPlanner.types';

export const PLANNER_MEAL_ORDER: { key: MealCategory; label: string; shortLabel: string }[] = [
  { key: 'breakfast', label: 'Breakfast', shortLabel: 'Breakfast' },
  { key: 'lunch', label: 'Lunch', shortLabel: 'Lunch' },
  { key: 'snacks', label: 'Snack', shortLabel: 'Snack' },
  { key: 'dinner', label: 'Dinner', shortLabel: 'Dinner' },
];

export const DOUBLE_TAP_WINDOW_MS = 220;

export function getSundayWeekStart(referenceDateStr: string = getTodayDateKey()): string {
  const ref = parseDateKey(referenceDateStr);
  const sunday = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - ref.getDay());
  return formatDateKey(sunday);
}

export function getWeekDateKeys(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function toSlotKey(coord: SlotCoord): string {
  return `${coord.date}:${coord.meal}`;
}

export function fromSlotKey(key: string): SlotCoord {
  const [date, meal] = key.split(':');
  return { date, meal: meal as MealCategory };
}

export function isSameSlot(a?: SlotCoord | null, b?: SlotCoord | null): boolean {
  if (!a || !b) return false;
  return a.date === b.date && a.meal === b.meal;
}

export function toggleSlotInList(list: SlotCoord[], target: SlotCoord): SlotCoord[] {
  const exists = list.some((item) => isSameSlot(item, target));
  if (exists) return list.filter((item) => !isSameSlot(item, target));
  return [...list, target];
}

export function buildAllWeekSlotCoords(weekStart: string): SlotCoord[] {
  const dates = getWeekDateKeys(weekStart);
  const coords: SlotCoord[] = [];
  for (const date of dates) {
    for (const { key } of PLANNER_MEAL_ORDER) {
      coords.push({ date, meal: key });
    }
  }
  return coords;
}

export function filterCatalogDishes(
  dishes: CatalogDish[],
  filter: DishCatalogFilter,
  query: string,
): CatalogDish[] {
  const normalizedQuery = query.trim().toLowerCase();
  return dishes.filter((dish) => {
    const matchesFilter =
      filter === 'liked'
        ? dish.isLiked
        : filter === 'recently_added'
          ? dish.isRecentlyAdded
          : dish.isSuggested;
    if (!matchesFilter && !normalizedQuery) return false;
    if (!normalizedQuery) return true;
    const inTitle = dish.name.toLowerCase().includes(normalizedQuery);
    const inReason = dish.reason?.toLowerCase().includes(normalizedQuery) ?? false;
    const inIngredients = dish.ingredients?.some((ing) => ing.toLowerCase().includes(normalizedQuery)) ?? false;
    return inTitle || inReason || inIngredients;
  });
}

export function findMemberOwnProposal(slot: PlannerSlotViewModel | undefined, userId: string): MealProposal | undefined {
  if (!slot) return undefined;
  return slot.proposals.find((p) => p.proposerId === userId);
}

export function findMemberActiveProposal(
  slot: PlannerSlotViewModel | undefined,
  userId: string,
): MealProposal | undefined {
  if (!slot) return undefined;
  if (slot.myChoiceProposalId) {
    const byId = slot.proposals.find((p) => p.id === slot.myChoiceProposalId);
    if (byId) return byId;
  }
  const byParticipant = slot.proposals.find((p) => p.participantMemberIds.includes(userId));
  if (byParticipant) return byParticipant;
  return findMemberOwnProposal(slot, userId);
}

export function doesUserHaveDishInSlot(
  slot: PlannerSlotViewModel | undefined,
  userId: string,
  dishKey: string,
): boolean {
  const own = findMemberOwnProposal(slot, userId);
  if (!own) return false;
  return own.dishes.some((d) => d.dishKey === dishKey);
}

export function getSlotParticipantMembers(
  slot: PlannerSlotViewModel | undefined,
  members: HouseholdMember[],
): HouseholdMember[] {
  if (!slot) return [];
  const ids = new Set<string>();
  for (const proposal of slot.proposals) {
    for (const id of proposal.participantMemberIds) ids.add(id);
    if (proposal.dishes.length > 0) ids.add(proposal.proposerId);
  }
  return members.filter((m) => ids.has(m.id));
}

export function formatBundleDishNames(dishes: ProposalDishItem[]): string {
  if (dishes.length === 0) return 'No dishes selected';
  return dishes.map((d) => d.name).join(' • ');
}

export function formatSlotTitle(dateStr: string, meal: MealCategory): string {
  const date = parseDateKey(dateStr);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const mealLabel = PLANNER_MEAL_ORDER.find((m) => m.key === meal)?.label ?? meal;
  return `${weekday} ${mealLabel}`;
}

export function formatShortDayLabel(dateStr: string): { dayName: string; dateNum: number } {
  const days = getWeekDays(dateStr, dateStr);
  const match = days.find((d) => d.dateString === dateStr);
  if (match) return { dayName: match.dayName, dateNum: match.dayNumber };
  const d = parseDateKey(dateStr);
  return {
    dayName: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3),
    dateNum: d.getDate(),
  };
}

/**
 * Client-side bulk assignment preview calculator so the admin sees immediate feedback
 * when choosing a strategy and member sources in Mode A (Bulk Grid).
 */
export function computeBulkAssignPreview(
  slotsMap: Record<string, PlannerSlotViewModel>,
  selectedCoords: SlotCoord[],
  strategy: BulkAssignStrategy,
  sourceMemberIds: string[],
  members: HouseholdMember[],
): BulkAssignResult {
  const affectedSlots: BulkAssignAffectedSlot[] = [];
  let populatedCount = 0;
  let emptyCount = 0;
  let needsReviewCount = 0;

  for (const coord of selectedCoords) {
    const slot = slotsMap[toSlotKey(coord)];
    const proposals = slot?.proposals ?? [];

    if (strategy === 'member_complete') {
      const targetUserId = sourceMemberIds[0];
      const member = members.find((m) => m.id === targetUserId);
      const memberProposal =
        proposals.find((p) => p.participantMemberIds.includes(targetUserId) && p.dishes.length > 0) ??
        proposals.find((p) => p.proposerId === targetUserId && p.dishes.length > 0);

      if (memberProposal && memberProposal.dishes.length > 0) {
        populatedCount += 1;
        affectedSlots.push({
          date: coord.date,
          meal: coord.meal,
          status: 'ready',
          sourceNote: `${member?.name ?? 'Member'}'s meal`,
          dishes: memberProposal.dishes,
        });
      } else {
        emptyCount += 1;
        affectedSlots.push({
          date: coord.date,
          meal: coord.meal,
          status: 'empty',
          sourceNote: null,
          dishes: [],
        });
      }
    } else if (strategy === 'union') {
      const relevant = proposals.filter(
        (p) =>
          sourceMemberIds.length === 0 ||
          sourceMemberIds.includes(p.proposerId) ||
          p.participantMemberIds.some((id) => sourceMemberIds.includes(id)),
      );
      const seen = new Set<string>();
      const combined: ProposalDishItem[] = [];
      for (const prop of relevant) {
        for (const dish of prop.dishes) {
          const key = dish.dishKey || dish.name.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            combined.push(dish);
          }
        }
      }
      if (combined.length > 0) {
        populatedCount += 1;
        needsReviewCount += 1;
        affectedSlots.push({
          date: coord.date,
          meal: coord.meal,
          status: 'needs_review',
          sourceNote: 'Combined dishes (review required)',
          dishes: combined,
        });
      } else {
        emptyCount += 1;
        affectedSlots.push({
          date: coord.date,
          meal: coord.meal,
          status: 'empty',
          sourceNote: null,
          dishes: [],
        });
      }
    } else {
      // intersection
      const activeBundles = proposals
        .filter(
          (p) =>
            p.dishes.length > 0 &&
            (sourceMemberIds.length === 0 ||
              sourceMemberIds.includes(p.proposerId) ||
              p.participantMemberIds.some((id) => sourceMemberIds.includes(id))),
        )
        .map((p) => p.dishes);

      if (activeBundles.length === 0) {
        emptyCount += 1;
        affectedSlots.push({
          date: coord.date,
          meal: coord.meal,
          status: 'empty',
          sourceNote: 'Common dishes',
          dishes: [],
        });
      } else {
        const [first, ...rest] = activeBundles;
        const common = first.filter((dish) =>
          rest.every((bundle) =>
            bundle.some(
              (other) =>
                (other.dishKey && other.dishKey === dish.dishKey) ||
                other.name.toLowerCase() === dish.name.toLowerCase(),
            ),
          ),
        );
        if (common.length > 0) {
          populatedCount += 1;
          needsReviewCount += 1;
          affectedSlots.push({
            date: coord.date,
            meal: coord.meal,
            status: 'needs_review',
            sourceNote: 'Common dishes',
            dishes: common,
          });
        } else {
          emptyCount += 1;
          affectedSlots.push({
            date: coord.date,
            meal: coord.meal,
            status: 'empty',
            sourceNote: 'No common dishes',
            dishes: [],
          });
        }
      }
    }
  }

  return {
    selectedCount: selectedCoords.length,
    populatedCount,
    emptyCount,
    needsReviewCount,
    affectedSlots,
  };
}

/**
 * Coordinates single-tap vs double-tap on a 7x4 slot cell so double-tap never mutates selection.
 */
export function createDoubleTapCoordinator(windowMs: number = DOUBLE_TAP_WINDOW_MS) {
  let pendingKey: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clear = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    pendingKey = null;
  };

  const registerTap = (key: string, onSingleTap: () => void, onDoubleTap: () => void) => {
    if (pendingKey === key && timer !== null) {
      clear();
      onDoubleTap();
      return;
    }
    if (timer !== null) {
      clear();
    }
    pendingKey = key;
    timer = setTimeout(() => {
      timer = null;
      pendingKey = null;
      onSingleTap();
    }, windowMs);
  };

  return { registerTap, clear };
}
