# Data Model: Meal Box and Suggestion Picker

## Database

No changes. `PlannedDish`, `MealResponse`, and `MealDay` are used as they are.

## Existing data used

| Data | Used for |
|---|---|
| `ScheduledDish.status` | Which dishes get a box, and which show as waiting |
| `ScheduledDish.memberIds` | Selected count and the current person's selection |
| `MealDayState.status`, `votingEndsAt` | What each person may do on the day |
| `DishOptions` | Liked, Newly added, and Possible dishes sections |
| `HouseholdMember[]` | The M in "N of M" |

## New client-only types

### PickerItem

One card in the picker.

| Field | Type | Notes |
|---|---|---|
| `key` | string | Unique within the picker |
| `name` | string | Up to 150 characters |
| `minutes` | number, optional | Shown only when known |
| `reason` | string, optional | Existing option text, or the selected count |
| `state` | `suggest`, `select`, `selected`, `onPlan`, `waiting` | See below |
| `option` | `DishOption`, optional | Set for dishes not yet on the meal |
| `dish` | `ScheduledDish`, optional | Set for dishes already on the meal |

Exactly one of `option` or `dish` is set.

### PickerSection

| Field | Type | Notes |
|---|---|---|
| `key` | `household`, `liked`, `new`, `possible` | Fixed order |
| `title` | string | Section label |
| `items` | `PickerItem[]` | A section with no items is left out |

## Validation rules

- Repeated dishes are removed by key and case-insensitive name, keeping the first (FR-016).
- A typed dish needs 2 to 150 characters (FR-018). The API checks this too.
- Tapping `waiting` or `onPlan` does nothing (FR-020).

## Card states

| State | When | Tap result |
|---|---|---|
| `suggest` | Dish is not on the meal | Adds the dish: pending for a member, approved for the admin |
| `select` | Approved dish, timer running, not yet chosen | Selects it |
| `selected` | Approved dish, timer running, already chosen | Removes the selection |
| `onPlan` | Approved dish, timer not running | None |
| `waiting` | Pending suggestion | None |

```text
suggest --member taps--> waiting --admin approves--> select or onPlan
suggest --admin taps--> select or onPlan
waiting --admin declines--> removed from the picker
select <--tap--> selected
any state --day becomes fixed or past--> picker can no longer be opened
```

A declined dish is not listed as a household pick, so it can be suggested again from its original source.
