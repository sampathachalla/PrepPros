# Contract: Mobile UI

This feature adds no API. This file defines the component interfaces and the existing API behavior they depend on.

## Component interfaces

### `DishCard`

Takes up one of two columns. The count always renders as `{picked} of {total}`, including zero. Tap to choose and hold to remove stay the same.

### `MealSection`

| Change | Detail |
|---|---|
| Adds `onAdd: () => void` | Replaces navigation to the Plan tab |
| Removes | The meal-level answered badge |
| Adds | A `SuggestionRow` for each of a member's own non-approved dishes, with `canDecide` false |

### `MealPickerPanel`

Existing props stay. `onPick` keeps its current signature, so `PlanDishSheet` needs no change.

| New prop | Type | Behavior |
|---|---|---|
| `householdDishes` | `ScheduledDish[]`, optional | Fills Household picks. Hidden when absent or empty. |
| `memberCount` | `number`, optional | Used for the count on household cards |
| `myId` | `string`, optional | Works out `select` and `selected` |
| `canAnswer` | `boolean`, optional | Defaults to false |
| `onToggleChoice` | `(dish) => Promise<DishActionResult>`, optional | Called for `select` and `selected` cards |

### `MealPickerSheet` (new)

| Prop | Type | Behavior |
|---|---|---|
| `meal` | `MealCategory \| null` | Null keeps the sheet closed |
| `title` | `string` | Header text |
| `date` | `string` | The day being changed |
| `dishes` | `ScheduledDish[]` | The meal's visible dishes |
| `members` | `HouseholdMember[]` | Used for counts |
| `myId` | `string` | The current person |
| `canAnswer` | `boolean` | Whether selecting is allowed |
| `onClose` | `() => void` | Closes without changing the plan |

The sheet stays open after a pick, matching `PlanDishSheet`, and lists what was added.

### Helpers in `dayPlanUtils`

```text
buildPickerSections({ options, householdDishes, myId, memberCount, canAnswer }) -> PickerSection[]
```

This is a pure function.

## Existing API behavior relied on

No changes are needed to these endpoints.

| Action | Endpoint | Relied-on result |
|---|---|---|
| Load the picker | `GET /calendar/dish-options?meal=` | `recentlySaved`, `liked`, and `suggested`, up to 8 each |
| Add or suggest | `POST /calendar/dishes` | Member: pending. Admin: approved. |
| Duplicate dish | `POST /calendar/dishes` | `409` with a message for the person |
| Fixed or past day | `POST /calendar/dishes` | `409`, nothing saved |
| Select | `POST /calendar/dishes/:id/accept` | `409` if unapproved or the timer isn't running |
| Remove a selection | `DELETE /calendar/dishes/:id/accept` | `409` if the timer isn't running |
| Refresh | `GET /calendar` | Members get approved dishes on non-draft days plus their own |

## Accessibility

- Tabs use the `tab` role with selected state.
- Cards have the `button` role, with a label that includes the dish name and its state.
- Waiting and on-plan cards are marked disabled.
