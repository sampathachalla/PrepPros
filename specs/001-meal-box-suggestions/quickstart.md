# Quickstart: Meal Box and Suggestion Picker

Use these scenarios to confirm the feature works once it is built. None have been run yet.

## Prerequisites

- API and database running
- Mobile app running: `cd mobile && npm run start`
- A household with one admin and at least one member, signed in on two devices
- The member has at least one liked dish and one saved link

## Automated checks

Run these only when you choose to, with `/pros-test-components` or directly:

```bash
cd mobile && npx jest app/features/calendar/__tests__/dayPlanUtils.test.ts
```

Expected: tests for `buildPickerSections` pass.

## Scenarios

### 1. Meal box (User Story 1)

1. As admin, add a dish to Breakfast using `+ Add`, then start a 1-hour timer.
2. As member, open that day. The box shows the dish name and `0 of N`, and the top of the day shows the time left.
3. Tap the box. Within 15 seconds, the admin's device shows `1 of N`.
4. As admin, end the timer. The top of the day shows that it's fixed, and boxes can no longer be tapped.

### 2. Suggest a dish (User Story 2)

1. Start a timer on another day.
2. As member, tap `+ Suggest`. The picker opens over the day on the For you tab.
3. Confirm the two-column list and section labels, and that at least 4 cards are visible.
4. Tap a liked dish. It is confirmed, and the meal shows it as waiting for the admin.
5. Close the picker. As admin, approve it on the Plan tab.
6. As member, reopen the picker. The dish is selectable under Household picks.

### 3. Search (User Story 3)

1. Open the Search tab and type part of a listed dish's name. Matches appear.
2. Type a name with no match. `Add` offers the typed name, and tapping it creates a suggestion.

### 4. Edge cases

| Check | Expected |
|---|---|
| Suggest a dish already on the meal | No duplicate. It shows under Household picks. |
| Timer ends with the picker open, then tap a dish | Error shown, nothing added |
| No liked dishes | The Liked section is hidden |
| Turn off the network, then open the picker | Load error shown, not an empty list |
| Fixed or past day | No `+ Suggest` or `+ Add` button |
| Plan tab add-dish sheet | Shows the new layout and still adds dishes, including to other days |

## Done when

All spec success criteria are confirmed in [spec.md](spec.md), and the checks above behave as described.
