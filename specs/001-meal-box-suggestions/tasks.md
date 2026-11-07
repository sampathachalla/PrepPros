---

description: "Task list for the meal box and suggestion picker"
---

# Tasks: Meal Box and Suggestion Picker

**Input**: Design documents from `specs/001-meal-box-suggestions/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/mobile-ui.md](contracts/mobile-ui.md)

**Tests**: The spec doesn't ask for tests. T002 and T008 are included because [plan.md](plan.md) and [quickstart.md](quickstart.md) list unit tests for the two new helpers. Write them, but don't run them unless asked.

**Organization**: Tasks are grouped by user story so each story can be built and checked on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: The user story this task belongs to
- All paths are relative to the repository root.

## Phase 1: Setup

No tasks. The feature adds no dependencies, configuration, or project structure.

---

## Phase 2: Foundational

No tasks. No API or database work is needed, and each story's code is listed in its own phase.

---

## Phase 3: User Story 1 - See a meal's status at a glance (Priority: P1) 🎯 MVP

**Goal**: Each approved dish appears in a box with its name, selected count, and time left.

**Independent Test**: Plan a dish, start the timer, and have one member select it. Every household member sees the dish name, `1 of N`, and a live countdown.

### Implementation for User Story 1

- [X] T001 [P] [US1] Add `dishBoxStatus(day, nowMs): string | undefined` in `mobile/app/features/calendar/utils/dayPlanUtils.ts`. Return `formatTimeLeft(day.votingEndsAt, nowMs)` when `isTimerRunning` is true, `'Fixed'` when `isDayFixed` is true, and `undefined` otherwise.
- [X] T002 [US1] Add `dishBoxStatus` tests for running, expired, fixed, and draft days in `mobile/app/features/calendar/__tests__/dayPlanUtils.test.ts`, reusing the file's `open`, `expired`, `fixed`, and `draft` fixtures.
- [X] T003 [P] [US1] Update `mobile/app/features/calendar/components/DishCard.tsx`: add the optional `statusLabel?: string` prop and show it when present. Always show the count as `{pickers.length} of {members.length}`, including zero, instead of `n/m` only when above zero. Add the count and status to `accessibilityLabel`. Keep the fill bar, tap to choose, hold to remove, and the two-line name limit.
- [X] T004 [US1] Update `mobile/app/features/calendar/components/MealSection.tsx`: add `statusLabel?: string` and pass it to each `DishCard`. Remove the meal-level answered badge, the `answered` value, the `countPeopleAnswered` import, and the `countBadge` and `countText` styles. Keep the utility itself in `householdUtils.ts`. Keep the existing empty state, so a meal with no dish shows no count or timer. Depends on T003.
- [X] T005 [US1] Update `mobile/app/features/calendar/components/DayPage.tsx`: compute `dishBoxStatus(day, now)` from the existing one-second `now` value and pass it to each `MealSection` as `statusLabel`. Depends on T001 and T004.

**Checkpoint**: The meal box is complete. The `+ Add` and `+ Suggest` buttons still go to the Plan tab.

---

## Phase 4: User Story 2 - Suggest a dish from the picker (Priority: P2)

**Goal**: `+ Suggest` and `+ Add` open a picker over the day, with sections in a two-column list.

**Independent Test**: As a member, tap `+ Suggest` on a meal with liked dishes, tap a dish, and confirm it's recorded as a waiting suggestion without leaving the day.

### Implementation for User Story 2

- [X] T006 [US2] Add `PickerItem` and `PickerSection` to `mobile/app/features/calendar/types/calendar.ts`, matching [data-model.md](data-model.md). `state` is `suggest`, `select`, `selected`, `onPlan`, or `waiting`. `PickerSection.key` is `household`, `liked`, `new`, or `possible`. "Exactly one of `option` or `dish` is set."
- [X] T007 [US2] Add `buildPickerSections({ options, householdDishes, myId, memberCount, canAnswer }): PickerSection[]` in `mobile/app/features/calendar/utils/dayPlanUtils.ts`. Use the section order and titles Household picks (approved and pending `householdDishes`, never declined), Liked (`options.liked`), Newly added (`options.recentlySaved`), Possible dishes (`options.suggested`). Set `state` using the Card states table in [data-model.md](data-model.md). Show `{count} of {memberCount}` as `reason` on household cards. "Repeated dishes are removed by key and case-insensitive name, keeping the first." "A section with no items is left out." Depends on T006.
- [X] T008 [US2] Add `buildPickerSections` tests in `mobile/app/features/calendar/__tests__/dayPlanUtils.test.ts` covering section order, hidden empty sections, removal of repeats by key and case-insensitive name, declined dishes left out, and all five card states. Depends on T007.
- [X] T009 [US2] Update `mobile/app/features/calendar/components/MealPickerPanel.tsx`: add the optional `householdDishes`, `memberCount`, `myId`, `canAnswer`, and `onToggleChoice` props from [contracts/mobile-ui.md](contracts/mobile-ui.md), leaving `onPick` unchanged. Replace the three chip tabs with For you and Search tabs, opening on For you, using the `tab` accessibility role. Replace the horizontal `FlatList` with a `SectionList` that has labelled headers and rows of two cards, with `keyboardShouldPersistTaps="handled"`, `nestedScrollEnabled`, and a bounded height from `useWindowDimensions` that shows at least 4 cards. Each card shows the name, plus `minutes` when known. `suggest` cards call `onPick`. `select` and `selected` cards call `onToggleChoice`. `onPlan` and `waiting` cards are disabled and show `On the plan` or `Waiting for the admin`. Keep the loading state, load error, per-card spinner, and inline error. Show an empty message when no section has dishes. Keep the existing search input and typed-dish button working until T015. Depends on T007.
- [X] T010 [US2] Create `mobile/app/features/calendar/components/MealPickerSheet.tsx` with the props in [contracts/mobile-ui.md](contracts/mobile-ui.md), following the `Modal`, `KeyboardAvoidingView`, backdrop, header, and close button pattern in `mobile/app/features/planning/components/PlanDishSheet.tsx`. It must not import from `planning`. Implement `onPick` with the same source selection as `PlanDishSheet` (`recipeId`, then `bookmarkId`, then `fromDishId`, then `name`), and call `useCalendarStore.getState().addDish` once, with no other-days option. Implement `onToggleChoice` with `acceptDish` or `withdrawDish`. Return `ApiError.message` on failure, so a fixed-day rejection appears in the picker. Use haptics, stay open after a pick, and list the added dishes. Depends on T009.
- [X] T011 [P] [US2] Export `MealPickerSheet` from `mobile/app/features/calendar/index.ts`. Depends on T010.
- [X] T012 [US2] Update `mobile/app/features/calendar/components/MealSection.tsx`: add `onAdd: () => void` and call it from the button, removing `openInPlan`, `useRouter`, and the `dateKey` prop if nothing else uses it. Keep the haptic and the `Add` and `Suggest` labels with the leading plus icon. For dishes where `dish.status !== 'approved'`, `dish.addedById === myId`, and `!permissions.canEditPlan`, render `SuggestionRow` with `canDecide={false}` so a member sees their own suggestion on the meal. Depends on T004.
- [X] T013 [US2] Update `mobile/app/features/calendar/components/DayPage.tsx`: add `openMeal: MealCategory | null` state, pass `onAdd` to each `MealSection`, and render one `MealPickerSheet` with `dishes[openMeal]`, `members`, `myId`, `canAnswer={permissions.canAnswer}`, and a title of `Add to {label}` or `Suggest for {label}`. Depends on T005, T010, and T012.

**Checkpoint**: Members can suggest and admins can add from the calendar without leaving the day.

---

## Phase 5: User Story 3 - Find any dish with Search (Priority: P3)

**Goal**: A person can search the picker's dishes, or suggest a typed name.

**Independent Test**: On the Search tab, type part of a listed dish's name and confirm it appears. Then type a name with no match and suggest it.

### Implementation for User Story 3

- [X] T014 [US3] Make `filterDishOptions` generic over `{ name: string }` in `mobile/app/features/calendar/utils/dayPlanUtils.ts`, so it can filter picker items as well as dish options. Keep its behavior the same for existing callers. Depends on T007.
- [X] T015 [US3] Update `mobile/app/features/calendar/components/MealPickerPanel.tsx`: show the search input only on the Search tab. Search across the items of all sections from `buildPickerSections`, shown in the two-column list, and show all items while the text is empty. "A typed dish needs 2 to 150 characters", so keep `maxLength={150}` and show the `Add “name”` button at 2 or more characters. Keep the `Nothing saved matches that` message when nothing matches. Depends on T009 and T014.

**Checkpoint**: All three user stories work.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T016 Check that the shared panel still fits and works inside `mobile/app/features/planning/components/PlanDishSheet.tsx`, including adding to other days. Change this file only if the picker doesn't fit.
- [X] T017 Run a type check with `npx tsc --noEmit` from `mobile/`, and fix any errors in files listed in `specs/001-meal-box-suggestions/plan.md`.
- [ ] T018 When the user asks, work through `specs/001-meal-box-suggestions/quickstart.md` and record which scenarios passed. Report anything not run as not run.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup and Foundational**: No tasks.
- **User Story 1**: Can start immediately.
- **User Story 2**: `MealSection` and `DayPage` depend on User Story 1, so finish it first.
- **User Story 3**: Depends on T007 and T009 from User Story 2.
- **Polish**: Runs after the stories you plan to ship.

### User Story Dependencies

```text
US1 (MVP) --> US2 --> US3 --> Polish
```

US1 ships on its own. US2 can ship without US3, because the current search stays in place until T015.

### Within Each Story

- Helpers come before the components that use them.
- `MealPickerPanel` comes before `MealPickerSheet`.
- `DayPage` comes last in each story, because it connects the pieces.

---

## Parallel Opportunities

### User Story 1

```text
T001 dishBoxStatus in dayPlanUtils.ts
T003 DishCard.tsx
```

### User Story 2

```text
After T010: T011 index.ts export and T012 MealSection.tsx
```

### Between stories

Stories 1 and 2 both change `MealSection.tsx` and `DayPage.tsx`, so build them in order.

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete T001 to T005.
2. Check the meal box with Scenario 1 in [quickstart.md](quickstart.md).
3. Stop here if you want to ship the meal box alone.

### Incremental Delivery

1. **US1**: Meal box with count and timer.
2. **US2**: Picker over the day.
3. **US3**: Search tab.
4. **Polish**: Plan tab check, type check, and quickstart.

## Notes

- After implementation, the timer was removed from the boxes at the user's request, along with `dishBoxStatus` and its tests. This reverses T001, T002, and the status parts of T003 to T005.
- `.specify/memory/constitution.md` is still blank, so no constitution rules apply yet.
- The API already enforces approval, duplicates, fixed days, and past days. Don't add a task to change it.
