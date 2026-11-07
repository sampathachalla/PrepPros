# Implementation Plan: Meal Box and Suggestion Picker

**Branch**: `version-1/calendar-feature` | **Date**: 2026-11-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-meal-box-suggestions/spec.md`

## Summary

Show each planned dish on the calendar as a box with its name and an "N of M" selected count, in a two-column grid. Replace the jump to the Plan tab with a picker that opens over the day. The picker has For you and Search tabs and a two-column list.

This is a mobile-only change. The API already enforces approval, duplicates, fixed days, and past days, and it already returns the data the picker needs. See [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6.0, React Native 0.88, Expo 58

**Primary Dependencies**: Zustand for calendar state, lucide-react-native for icons. No new dependencies.

**Storage**: No change. Existing PostgreSQL tables are used through the existing API.

**Testing**: Jest for mobile unit tests. Vitest API tests in `api/tests/calendar.test.ts` should be unaffected.

**Target Platform**: iOS and Android through Expo

**Project Type**: Mobile app with a REST API

**Performance Goals**: Picker scrolls smoothly with up to about 32 cards (8 per server list, plus the meal's own dishes). Counts refresh within 15 seconds.

**Constraints**: Keep the existing 15-second refresh. The server stays the source of truth for permissions, so client checks only decide what to show.

**Scale/Scope**: About 2 screens affected, 1 new component, 7 modified mobile source files, plus tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the blank template, so **no constitution gates were evaluated**. The project's global coding rules were used as a temporary check instead. Rerun this check after `/speckit-constitution`.

| Temporary gate | Before design | After design |
|---|---|---|
| Smallest change that solves the task | Pass | Pass: no API or database change |
| Reuse before adding code or dependencies | Pass | Pass: reuses `MealPickerPanel`, `DishCard`, `SuggestionRow` |
| No unrelated refactors | Pass | Pass: `PlanDishSheet` is left alone |
| Validate input at trust boundaries | Pass | Pass: existing API validation still applies |
| No tests run without being asked | Pass | Pass: planning ran no tests |

## Project Structure

### Documentation (this feature)

```text
specs/001-meal-box-suggestions/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── mobile-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Created by /speckit-tasks
```

### Source Code (repository root)

```text
mobile/app/features/calendar/
├── components/
│   ├── DayPage.tsx            # MODIFY: owns the open meal, renders the sheet
│   ├── DishCard.tsx           # MODIFY: always shows "N of M", stacked for two columns
│   ├── MealSection.tsx        # MODIFY: opens the sheet, drops the meal-level badge, shows own suggestions
│   ├── MealPickerPanel.tsx    # MODIFY: For you and Search tabs, sections, two-column list
│   ├── MealPickerSheet.tsx    # NEW: modal around the panel for the calendar
│   └── SuggestionRow.tsx      # REUSE
├── utils/dayPlanUtils.ts      # MODIFY: adds buildPickerSections
├── types/calendar.ts          # MODIFY: adds PickerItem and PickerSection
├── index.ts                   # MODIFY: exports the new sheet
└── __tests__/dayPlanUtils.test.ts  # MODIFY: covers the new helper

mobile/app/features/planning/components/
└── PlanDishSheet.tsx          # NO CODE CHANGE: shows the new panel layout through MealPickerPanel
```

**Structure Decision**: All work stays in the existing `calendar` feature. `planning` imports from `calendar`, and `calendar` does not import from `planning`, so the calendar gets a small sheet of its own rather than importing `PlanDishSheet`. See [research.md](research.md).

## Known Limits

- **Search scope**: each server list holds at most 8 dishes, so Search covers those lists, not everything a person has saved. A person can still type any dish name and suggest it.
- **Household picks**: members see approved dishes and their own suggestions only. Other members' waiting suggestions stay hidden, as they do today.
- **Plan tab**: its add-dish sheet shares the panel, so it gets the new layout too. The Plan page itself does not change.

## Complexity Tracking

No gate violations to justify.
