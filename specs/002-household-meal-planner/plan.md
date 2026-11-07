# Implementation Plan: Household Meal Planner

**Branch**: `version-1/feature/calendar` | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-household-meal-planner/spec.md`

## Summary

Separate PrepPros's household meal experience into two distinct surfaces:
1. **Published Calendar (`/(tabs)/calendar`)**: A simple, read-only daily menu view ("what are we eating today?") with a Sunday–Saturday `WeekStrip`, horizontal day-to-day swiping, and four stacked meal sections (`Breakfast`, `Lunch`, `Snacks`, `Dinner`) showing finalized dishes in a two-column grid (or `"Menu not finalized"` when unpublished).
2. **Collaborative Meal Planner (`/(tabs)/meal-prep`)**: A six-screen collaborative weekly planning flow powered by a single reusable 7 × 4 `WeeklySlotGrid` component (`mode: 'dish-selection' | 'slot-management' | 'bulk-finalization'`), a unified two-column `DishGrid`, and complete multi-dish member proposals (`MealProposalCard`):
   - **Page 1 — Dish Library (`DishLibraryScreen`)**: Searchable two-column photo grid with `Liked`, `Recently Added`, and `Suggested` filters over one unified dish catalog.
   - **Page 2 — Dish Weekly Slot Picker (`DishWeeklyPickerScreen`)**: Movie-ticket-booking-style 7 × 4 grid with buffered single-tap multi-selection, double-tap + accessible `"View household choices"` navigation, and lock indicators for admin-reserved slots.
   - **Page 3 — Meal Slot / Household Choices (`MealSlotDetailsScreen`)**: Complete meal bundles grouped by proposer with `"I'll eat this meal"` and `"Keep my own meal"` actions.
   - **Page 4 — My Weekly Review (`MyWeeklyReviewScreen`)**: Weekly review of chosen meal combinations, deadline display, and `"Submit Weekly Meal Plan"` (`Draft` → `Submitted` → `Locked`).
   - **Page 5 — Admin Manage Slots (`ManageSlotsScreen`)**: Admin-only 7 × 4 grid toggling slots between `Available` and `Reserved` with confirmation when existing member selections are affected.
   - **Page 6 — Admin Finalize Weekly Menu (`FinalizeWeeklyMenuScreen`)**: Admin-only screen toggling seamlessly between **Mode A (Bulk Grid)** and **Mode B (Daily Review Carousel)** over an unpublished weekly menu draft, culminating in `"Publish Weekly Menu"`.

See [research.md](research.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md), and [contracts/mobile-ui.md](contracts/mobile-ui.md).

## Technical Context

**Language/Version**: TypeScript 6.0, Node.js (Express 5 API), React Native 0.88 / Expo 58 (Mobile)

**Primary Dependencies**: Express 5, Prisma 7 (`@prisma/client`, `@prisma/adapter-pg`), Zod (API validation); Expo Router, Zustand (client state), `lucide-react-native`, `expo-image` (Mobile). **No new external dependencies required.**

**Storage**: PostgreSQL via Prisma (`WeeklyPlan`, `MealSlotPolicy`, `MealProposal`, `MealProposalDish`, `MemberSlotChoice`, `MemberWeeklySubmission`, `WeeklyMenuDraftSlot`, `WeeklyMenuDraftDish`, plus published snapshot into `MealDay` / `PlannedDish`).

**Testing**: Vitest + Supertest (`api/tests/`), Jest + React Native Testing Library (`mobile/app/features/mealPrep/__tests__/`). Per project rules, tests are **not run** automatically unless explicitly requested.

**Target Platform**: iOS and Android via Expo Router (responsive down to small phone viewports); Node.js API server.

**Project Type**: Full-stack Mobile App (`mobile/`) + REST API (`api/`)

**Performance Goals**:
- 60 fps scrolling in 2-column `DishGrid` and 7-day `DailyReviewCarousel`.
- 0 network requests on single-tap slot selection in `WeeklySlotGrid` (writes happen only on explicit Add / Save / Publish).
- Atomic single-transaction writes for multi-slot dish booking, slot-policy updates, bulk draft assignment, and weekly publication.

**Constraints**:
- Server owns all authorization, role checks (`admin` vs `member`), slot reservation locks (`available` vs `reserved`), and weekly `submissionDeadline` cutoffs.
- Editing member proposals or the admin's `WeeklyMenuDraftSlot` must never overwrite the Published Calendar until the admin explicitly executes `POST /meal-planner/weeks/:weekStart/publish`.
- Double-tap on `WeeklySlotGrid` must never be the sole way to reach Meal Slot Details; an explicit accessible `"View household choices"` button is always provided.

**Scale/Scope**: 1 Prisma migration, 1 new API module (`api/src/modules/mealPlanner/`) + read-only update to `api/src/modules/calendar/`, 6 Meal Planner screens + 1 updated Calendar screen, and 11 reusable UI components in `mobile/`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against `.specify/memory/constitution.md` (Version 1.0.0, ratified 2026-11-07) and `pros-toolkit` rules:

| Constitution Principle / Gate | Pre-Design Check | Post-Design Check |
|---|---|---|
| **I. Server-Owned Meal Planning Rules** | **PASS**: API will own slot policies, proposal membership, submission deadlines, draft finalization, and publication snapshots. | **PASS**: Enforced in `api/src/modules/mealPlanner/service.ts` with deterministic state transitions (`draft` → `submitted` → `locked`; `empty` → `needs_review` / `ready` → `published`). |
| **II. Privacy and Household Isolation** | **PASS**: All `/meal-planner` and `/calendar` routes authenticate via `requireAuth` and scope data to `requireMembership(userId).householdId`. | **PASS**: No client-supplied `householdId` is trusted; admin endpoints enforce `requireAdmin(membership)`. |
| **III. Typed Contracts at Every Boundary** | **PASS**: Zod schemas on all request bodies/params/queries; explicit `YYYY-MM-DD` date keys; reviewable Prisma migration. | **PASS**: Documented in [contracts/api.md](contracts/api.md), [contracts/mobile-ui.md](contracts/mobile-ui.md), and [data-model.md](data-model.md). |
| **IV. Resilient User Journeys** | **PASS**: Every screen defines loading, empty, error, locked/reserved, and unpublished states; multi-slot operations run in DB transactions. | **PASS**: Optimistic/local selection state in `WeeklySlotGrid` preserves work across Page 2 ↔ Page 3 navigation and failed requests. |
| **V. Small, Verifiable Changes & Reuse** | **PASS**: Reuses `WeekStrip`, `ContributorAvatarStack`, `useCalendarColors`, `MEAL_CATEGORIES`, and existing tab structure; zero new npm packages. | **PASS**: Single `WeeklySlotGrid` powers Pages 2, 5, and 6; single `DishGrid` powers Page 1 and Page 6 Mode B. No tests run unprompted. |

## Project Structure

### Documentation (this feature)

```text
specs/002-household-meal-planner/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Phase 0 architecture & reuse decisions
├── data-model.md        # Phase 1 Prisma schema & state transitions
├── quickstart.md        # Phase 1 end-to-end validation scenarios
└── contracts/
    ├── api.md           # REST API endpoints & payload schemas
    └── mobile-ui.md     # Screen inventory, navigation & component props
```

### Source Code (repository root)

```text
api/
├── prisma/
│   ├── schema.prisma                                  # MODIFY: add WeeklyPlan, MealSlotPolicy, MealProposal, MealProposalDish, MemberSlotChoice, MemberWeeklySubmission, WeeklyMenuDraftSlot, WeeklyMenuDraftDish
│   └── migrations/
│       └── YYYYMMDDHHMMSS_household_meal_planner/     # NEW: Prisma migration for meal planner tables
├── src/
│   ├── app.ts                                         # MODIFY: mount /meal-planner routes
│   └── modules/
│       ├── calendar/
│       │   └── service.ts                             # MODIFY: getCalendar returns only published menu snapshot (or unpublished status)
│       └── mealPlanner/                               # NEW: collaborative meal planner backend domain
│           ├── routes.ts                              # NEW: /meal-planner Express router
│           ├── controller.ts                          # NEW: HTTP handlers
│           ├── schema.ts                              # NEW: Zod schemas for dishes, slot booking, choices, slot policies, bulk assign, draft edit, publish
│           ├── service.ts                             # NEW: business rules (deadlines, reserved slots, proposal replacement, union/intersection, publish snapshot)
│           └── repository.ts                          # NEW: Prisma queries & transactions
└── tests/
    └── mealPlanner.test.ts                            # NEW: focused API tests (not run unless requested)

mobile/
├── routes/
│   └── (tabs)/
│       ├── _layout.tsx                                # REUSE/VERIFY: keeps Calendar and Meal Prep routes
│       ├── calendar.tsx                               # REUSE: renders read-only CalendarScreen
│       └── meal-prep.tsx                              # MODIFY: entry route for Meal Planner navigator / screens
└── app/
    └── features/
        ├── calendar/
        │   ├── screens/
        │   │   └── CalendarScreen.tsx                 # MODIFY: add "Plan Week" header action; read-only published view
        │   └── components/
        │       ├── DayPage.tsx                        # MODIFY: remove draft suggestion sheet & timer bar; show "Menu not finalized" when unpublished
        │       ├── MealSection.tsx                    # MODIFY: read-only 2-column published dish grid; remove "+ Suggest" button
        │       ├── DishCard.tsx                       # MODIFY: read-only published card; tap opens dish details modal
        │       ├── WeekStrip.tsx                      # REUSE: Sunday-Saturday date strip
        │       └── ContributorAvatarStack.tsx         # REUSE: shared avatar stack primitive
        └── mealPrep/                                  # MODIFY/EXPAND: houses Meal Planner screens, shared components, hooks, store & API service
            ├── screens/
            │   ├── DishLibraryScreen.tsx              # NEW (Page 1): 2-column catalog, search, Liked/Recently Added/Suggested filters, + Add dish
            │   ├── DishWeeklyPickerScreen.tsx         # NEW (Page 2): 7x4 WeeklySlotGrid (mode="dish-selection"), single/double tap + accessible CTA
            │   ├── MealSlotDetailsScreen.tsx          # NEW (Page 3): complete meal proposals by member, "I'll eat this meal" / "Keep my own meal"
            │   ├── MyWeeklyReviewScreen.tsx           # NEW (Page 4): member weekly summary, deadline banner, "Submit Weekly Meal Plan"
            │   ├── ManageSlotsScreen.tsx              # NEW (Page 5): admin 7x4 WeeklySlotGrid (mode="slot-management"), Available/Reserved toggle
            │   ├── FinalizeWeeklyMenuScreen.tsx       # NEW (Page 6): admin Bulk Grid + Daily Review Carousel toggle & "Publish Weekly Menu"
            │   └── MealPrepScreen.tsx                 # MODIFY: integrates Meal Planner flow with existing Cook/Shop prep view
            ├── components/
            │   ├── CatalogDishCard.tsx                # NEW: 2-column photo dish card with member interest count/avatars
            │   ├── DishGrid.tsx                       # NEW: reusable 2-column grid for Page 1 & Page 6 Mode B
            │   ├── WeeklySlotGrid.tsx                 # NEW: shared 7x4 grid (dish-selection, slot-management, bulk-finalization)
            │   ├── MealProposalCard.tsx               # NEW: complete meal bundle card for Page 3
            │   ├── HouseholdAvatarStack.tsx           # NEW: thin wrapper re-exporting ContributorAvatarStack with planner defaults
            │   ├── MealSlotStatus.tsx                 # NEW: slot status badge (Available, Reserved, Empty, Draft, Needs Review, Ready)
            │   ├── BulkActionBar.tsx                  # NEW: contextual bottom action bar for multi-slot operations & preview
            │   ├── DailyMealCard.tsx                  # NEW: single day card (Breakfast, Lunch, Snack, Dinner) for Mode B
            │   ├── DailyReviewCarousel.tsx            # NEW: 7-day horizontal swipeable review carousel for Mode B
            │   ├── MealSourceSelector.tsx             # NEW: admin bulk source selector (Member X, Combine/Union, Common/Intersection)
            │   └── SubmissionDeadline.tsx             # NEW: deadline countdown / cutoff status pill
            ├── hooks/
            │   ├── useMealPlanner.ts                  # NEW: orchestrates weekly planner state, active screen/sub-route, and refresh
            │   ├── useDishSelections.ts               # NEW: local buffered multi-slot selection & 220ms double-tap coordinator
            │   ├── useWeeklySlots.ts                  # NEW: slot policy & availability helpers
            │   ├── useHouseholdProposals.ts           # NEW: slot proposal grouping, join/replace confirmation, and own-meal toggle
            │   └── useAdminFinalization.ts            # NEW: Bulk Grid preview/apply, Daily Review edits, and Publish workflow
            ├── store/
            │   └── mealPlannerStore.ts                # NEW: Zustand store for weekly planner state, buffered selections, and admin draft
            ├── services/
            │   └── mealPlanner.api.ts                 # NEW: typed API client for /meal-planner endpoints
            ├── types/
            │   └── mealPlanner.types.ts               # NEW: TypeScript interfaces matching /meal-planner contracts
            └── utils/
                └── mealPlanner.utils.ts               # NEW: pure helpers for 7x4 grid indexing, bundle diffing, union/intersection preview
```

**Structure Decision**:
- Backend logic lives in a dedicated `api/src/modules/mealPlanner/` module (following PrepPros's `routes.ts` / `controller.ts` / `service.ts` / `repository.ts` / `schema.ts` pattern) while `api/src/modules/calendar/` is simplified to serve the read-only published menu.
- Mobile components live under `mobile/app/features/mealPrep/` (which already owns the `/(tabs)/meal-prep` route in `mobile/routes/(tabs)/_layout.tsx`), reusing `WeekStrip`, `ContributorAvatarStack`, `useCalendarColors`, and `dateUtils` from `mobile/app/features/calendar/`.

---

## Phased Implementation Roadmap

### Phase 1: Component Reuse & Foundation Setup
- Audit and wire exports from `mobile/app/features/calendar/` (`ContributorAvatarStack`, `WeekStrip`, `useCalendarColors`, `MEAL_CATEGORIES`, `dateUtils`).
- Add `mealPlanner.types.ts` and `mealPlanner.utils.ts` (slot coordinate keys, Sunday–Saturday date generation, double-tap timer helper, union/intersection calculators).

### Phase 2: Backend Schema, API & Shared Mobile Components
- Add Prisma models (`WeeklyPlan`, `MealSlotPolicy`, `MealProposal`, `MealProposalDish`, `MemberSlotChoice`, `MemberWeeklySubmission`, `WeeklyMenuDraftSlot`, `WeeklyMenuDraftDish`) and implement `api/src/modules/mealPlanner/`.
- Build the core shared mobile components:
  - `WeeklySlotGrid.tsx` (`dish-selection`, `slot-management`, `bulk-finalization` modes + 220ms gesture coordinator + accessible `"View household choices"` bar)
  - `CatalogDishCard.tsx` & `DishGrid.tsx` (two-column photo grid)
  - `MealProposalCard.tsx`, `MealSlotStatus.tsx`, `SubmissionDeadline.tsx`, and `HouseholdAvatarStack.tsx`.

### Phase 3: Member Screens (Pages 1–4)
- **Page 1 (`DishLibraryScreen.tsx`)**: Week header, search input, `Liked` / `Recently Added` / `Suggested` filter chips over unified catalog, `+ Add new dish` modal integration, and navigation to Page 2 / Page 4.
- **Page 2 (`DishWeeklyPickerScreen.tsx`)**: Local multi-slot selection buffer (`useDishSelections`), 1-slot contextual Add vs multi-slot bottom `"Add to N slots"`, already-added edit/remove state, and double-tap / button navigation to Page 3.
- **Page 3 (`MealSlotDetailsScreen.tsx`)**: Proposal cards grouped by member, `"I'll eat this meal"` (with replacement confirmation) and `"Keep my own meal"`, plus read-only view for `reserved` slots.
- **Page 4 (`MyWeeklyReviewScreen.tsx`)**: Day-by-day summary of complete meal bundles, slot `Edit` navigation, deadline display, and `"Submit Weekly Meal Plan"`.

### Phase 4: Admin Slot Management (Page 5)
- **Page 5 (`ManageSlotsScreen.tsx`)**: Reuses `WeeklySlotGrid` in `slot-management` mode with `Available` / `Reserved` mode toggle, multi-slot selection, warning confirmation when reserving slots with existing member proposals, and atomic save.

### Phase 5: Admin Finalization & Publication (Page 6) + Read-Only Calendar
- **Page 6 (`FinalizeWeeklyMenuScreen.tsx`)**:
  - **Mode A (`Bulk Grid`)**: `WeeklySlotGrid` (`mode="bulk-finalization"`), `MealSourceSelector` (Member X complete meals, Union/Combine, Intersection/Common dishes), preview modal (`BulkActionBar`), and `Needs Review` status flagging.
  - **Mode B (`Daily Review`)**: `DailyReviewCarousel.tsx` + `DailyMealCard.tsx` (7 swipeable daily cards) with `"Edit Dishes"` opening the reused 2-column `DishGrid` scoped to that `(date, meal)`.
  - **Publication**: `"Publish Weekly Menu"` with incomplete/empty-slot warning and override confirmation.
- **Published Calendar (`CalendarScreen.tsx`, `DayPage.tsx`, `MealSection.tsx`, `DishCard.tsx`)**: Update to strictly read-only published view with `"Menu not finalized"` state for unpublished weeks and dish detail modal on card tap.

### Phase 6: State Synchronization & Integration Review
- Connect `mealPlannerStore.ts` and `calendarStore.ts` so submitting plans, changing slot availability, updating admin drafts, and publishing synchronize cleanly across screens without leaking draft edits into the Published Calendar.

## Complexity Tracking

No Constitution Check violations. Zero new third-party packages introduced.
