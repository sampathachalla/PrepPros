# Research: Household Meal Planner

**Feature**: `002-household-meal-planner` | **Date**: 2026-11-07

## 1. Separation of Published Calendar vs Collaborative Meal Prep

- **Decision**: Repurpose `/(tabs)/calendar` (`CalendarScreen.tsx` + `DayMealsPanel` + `DayPage` + `MealSection`) into the **read-only Published Calendar**, while making `/(tabs)/meal-prep` (and its sub-screens under `mobile/app/features/mealPrep/` or `mealPlanner/`) the **collaborative weekly planning hub** for both household members and admins.
- **Rationale**:
  - The existing `CalendarScreen.tsx` already implements the Sunday–Saturday `WeekStrip`, horizontal day-to-day swiping (`DayMealsPanel`), and 4 stacked meal sections (`Breakfast`, `Lunch`, `Snacks`, `Dinner`) with a 2-column card layout. Stripping draft/suggestion mutation controls from `CalendarScreen` and binding it strictly to published menu data satisfies Section 3 of the Design Draft ("Calendar = published menu: a simple, read-only answer to 'what are we eating today?'") with minimal churn.
  - Keeping collaborative planning inside `meal-prep` preserves the existing tab bar (`chat`, `calendar`, `bookmarks`, `profile`, plus `meal-prep` accessible from Chat, Calendar header CTA `"Plan Week"`, and Meal Prep navigation) while cleanly isolating draft state from published calendar state.
- **Alternatives considered**:
  - *Keep inline voting and suggestion controls directly inside `CalendarScreen`*: Rejected because it violates the core product principle that draft edits and member proposals must never be confused with the finalized published calendar.
  - *Add 6 separate top-level tabs*: Rejected because it would overcrowd the bottom tab bar and break existing navigation conventions (`mobile/routes/(tabs)/_layout.tsx`).

## 2. Component Reuse Strategy Across `calendar`, `mealPrep`, `bookmarks`, and `recipes`

- **Decision**: Reuse and extend existing UI primitives rather than building parallel duplicates:
  1. **Avatar strips**: Reuse [`ContributorAvatarStack.tsx`](../../mobile/app/features/calendar/components/ContributorAvatarStack.tsx) (which already supports configurable `size`, `overlap`, `maxVisible`, and `+N` overflow badge) as `HouseholdAvatarStack` across `DishCard`, `WeeklySlotGrid` cells, and `MealProposalCard`.
  2. **Week & date utilities**: Reuse [`dateUtils.ts`](../../mobile/app/features/calendar/utils/dateUtils.ts), [`WeekStrip.tsx`](../../mobile/app/features/calendar/components/WeekStrip.tsx), and [`PrepWeekHeader.tsx`](../../mobile/app/features/mealPrep/components/PrepWeekHeader.tsx) for Sunday–Saturday week boundary calculation (`weekStart`) and header navigation.
  3. **Theme & meal category tokens**: Reuse [`useCalendarColors.ts`](../../mobile/app/features/calendar/hooks/useCalendarColors.ts), [`MEAL_CATEGORIES`](../../mobile/app/features/calendar/constants/calendar.ts), and [`MEAL_CATEGORY_COLORS`](../../mobile/app/features/calendar/constants/calendar.ts).
  4. **Shared 7 × 4 Grid (`WeeklySlotGrid.tsx`)**: Build one `WeeklySlotGrid` component supporting `mode: 'dish-selection' | 'slot-management' | 'bulk-finalization'` to power Page 2 (Dish Weekly Slot Picker), Page 5 (Admin Manage Slots), and Page 6 Mode A (Admin Bulk Finalize).
  5. **Shared 2-Column Dish Grid (`DishGrid.tsx` + `DishCard.tsx`)**: Build one reusable 2-column photo-card grid used by Page 1 (Dish Library) and Page 6 Mode B ("Edit Dishes" modal/sheet from Daily Review Carousel).
- **Rationale**: Directly fulfills Constitution Principle V ("Small, Verifiable Changes — reuse existing modules, components, schemas, design tokens, and dependencies") and Section 3 of the implementation guide ("Do not create duplicate versions of the weekly grid").
- **Alternatives considered**:
  - *Separate grid components for member booking, admin slot locking, and admin bulk assignment*: Rejected because all three share the exact 7 (Sun–Sat) × 4 (Breakfast, Lunch, Snack, Dinner) matrix layout, cell status badges, and multi-select mechanics.

## 3. Single-Tap vs Double-Tap Gesture Coordination on `WeeklySlotGrid`

- **Decision**: Implement a deterministic tap coordinator in `WeeklySlotGrid` (for `mode="dish-selection"`) with a `220ms` double-tap threshold **and** an explicit accessible action bar (`"View household choices"` button when a cell is focused/selected or via a cell info icon):
  - First tap on `(date, meal)` starts a `220ms` timer.
  - If a second tap arrives on the same `(date, meal)` within `220ms`, cancel the timer and invoke `onOpenSlotDetails(date, meal)` without toggling the slot's selection state.
  - If the timer expires without a second tap, toggle the slot in local `selectedSlots` state (never triggering an immediate API write).
  - Local `selectedSlots` state is held in `useDishSelections` / `mealPlannerStore` keyed by `(weekStart, dishKey)` so navigating to Page 3 (Meal Slot Details) and returning to Page 2 preserves unsaved selections.
- **Rationale**: Satisfies Section 5 of the Design Draft ("Gesture safety: defer the single-tap action until double-tap detection resolves; never save on a single tap. Preserve selection when returning from details. Provide a visible 'View household choices' alternative for discoverability and accessibility").
- **Alternatives considered**:
  - *Immediate toggle on first tap + undo on second tap*: Rejected because it causes visual flicker and accidental state flips when double-tapping.
  - *Double-tap only with no visible button*: Rejected because it fails accessibility and discoverability requirements.

## 4. Data Model Evolution: Proposals, Draft Finalization, and Published Snapshots

- **Decision**: Extend the Prisma schema (`api/prisma/schema.prisma`) with explicit models for weekly collaborative planning while preserving backward compatibility with existing `Recipe`, `Bookmark`, `Household`, `HouseholdMember`, and `ShoppingCheck` models:
  - `WeeklyPlan` (`householdId + weekStart`): Holds `submissionDeadline`, `publishedAt`, `publishedVersion`, and `hasUnpublishedChanges`.
  - `MealSlotPolicy` (`householdId + date + meal`): Holds `status: 'available' | 'reserved'` set by the admin in Page 5.
  - `MealProposal` (`id`, `householdId`, `date`, `meal`, `proposerId`): Represents one member's complete meal bundle for a slot, with ordered constituent dishes (`MealProposalDish[]`) and participant selections (`MemberSlotChoice[]`, unique per `householdId + date + meal + userId`).
  - `MemberWeeklySubmission` (`householdId + weekStart + userId`): Tracks `status: 'draft' | 'submitted' | 'locked'` and `submittedAt`.
  - `WeeklyMenuDraftSlot` (`householdId + date + meal`): Holds the admin's working finalized dishes (`WeeklyMenuDraftDish[]`) and review state (`empty` | `draft` | `needs_review` | `ready`) edited in Page 6 (both Bulk Grid and Daily Review Carousel).
  - `PublishedMealDish` (or `PlannedDish` with `publishedVersion` / `isPublished: true`): Represents the published snapshot served to `GET /calendar` and `GET /meal-prep` shopping/prep aggregation.
- **Rationale**:
  - Current `PlannedDish` + `MealResponse` only models individual dishes per meal with single-dish voting (`@@unique([householdId, date, meal, userId])`), which cannot represent a multi-dish **complete meal bundle** proposed by a member (`Rice + Tomato Dal + Sambar + Curd`) or keep the **admin working draft** independent from the **published calendar**.
  - Keeping `PublishedMealDish` / `PlannedDish` aligned allows existing shopping list derivation (`buildShoppingList` in `api/src/modules/mealPrep/service.ts`) to continue working seamlessly from published meals.
- **Alternatives considered**:
  - *Overload `PlannedDish.notes` with JSON arrays of bundle dishes*: Rejected because it violates Constitution Principle III ("Typed Contracts at Every Boundary") and prevents relational integrity for dish catalog references and member counts.
  - *Mutate published calendar rows in place during admin finalization*: Rejected because it violates the requirement that admin draft edits and member proposals must never overwrite the published calendar until explicit publication.

## 5. Unified Dish Catalog Filtering (Page 1 — Dish Library)

- **Decision**: Extend `GET /meal-planner/dishes` (building on `getDishOptions` in `api/src/modules/calendar/service.ts`) to query the unified dish catalog (`Recipe`, ready `Bookmark`, and household historical dishes) with server-side and client-side support for:
  - `filter`: `'liked' | 'recently_added' | 'suggested'`
  - `search`: case-insensitive substring match on title/ingredients
  - `weekStart`: returns `interestedMemberIds` (household members who have included the dish in any proposal for that week or liked it) so `DishCard` can render `"N members interested"` and `ContributorAvatarStack`.
- **Rationale**: Ensures `Liked`, `Recently Added`, and `Suggested` are filtered views over one deduplicated dish catalog rather than separate duplicate datasets.
- **Alternatives considered**:
  - *Three separate API endpoints returning uncoordinated dish shapes*: Rejected because a dish would appear with inconsistent IDs and member counts across filters.

## 6. Confirmed Product Decisions (from PDF Section 12)

1. **Joining another member's bundle**: Replaces the member's active `MemberSlotChoice` for that `(date, meal)` slot (one active bundle choice per person per slot), while retaining their own authored `MealProposal` in draft so `"Keep my own meal"` can restore it before deadline closure.
2. **Reserved slots**: Admin can reserve slots first (`status = 'reserved'`) without immediately assigning dishes; existing member proposals on that slot are retained in history (read-only), and publishing a week with an empty reserved slot triggers a warning modal with intentional override.
3. **Incomplete meals in bulk review (union/intersection)**: Bulk `union` and `intersection` operations populate `WeeklyMenuDraftSlot` with `status = 'needs_review'` and display explicit warnings in the Bulk Preview and Daily Review Carousel; no automatic nutritional completeness inference is performed.
