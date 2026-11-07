# Research: Meal Box and Suggestion Picker

All spec clarifications were resolved before planning. These decisions come from reading the current mobile and API code.

## 1. API changes

- **Decision**: No API or database changes.
- **Rationale**: `addDish` already makes a member's dish a pending suggestion and an admin's dish approved. It also rejects duplicates, fixed days, and past days. `acceptDish` already rejects unapproved dishes and days without a running timer.
- **Alternatives considered**: A new endpoint for picker data. Rejected because `GET /calendar/dish-options` and the calendar store already provide everything.

## 2. Selected count

- **Decision**: Show "N of M" on every dish box, including "0 of M". Remove the meal-level "answered" badge.
- **Rationale**: `dish.memberIds` already gives the count per dish. Two counts on one meal would compete.
- **Alternatives considered**: Keeping both counts. Rejected as noisy.

## 3. Timer placement

- **Decision**: Keep the time left in the bar at the top of the day and don't repeat it in each box.
- **Rationale**: The timer belongs to the whole day, so every box showed the same value. The user asked to remove it from the boxes.
- **Alternatives considered**: A timer in every box, which was built first and then removed.

## 4. Where the picker opens

- **Decision**: Add a small `MealPickerSheet` in the calendar feature, with its open state in `DayPage`. Admins and members share it.
- **Rationale**: `planning` depends on `calendar`, and no calendar file imports `planning`. Reusing `PlanDishSheet` would make that dependency two-way.
- **Alternatives considered**: Moving `PlanDishSheet` into `calendar`. Rejected as an unrequested refactor. Keeping the jump to the Plan tab. Rejected because FR-010 keeps people on the day.
- **Trade-off**: "Also add to" other days stays on the Plan tab only.

## 5. One picker or two

- **Decision**: Change `MealPickerPanel` in place, so the Plan tab and calendar share one picker.
- **Rationale**: Two pickers would drift apart. The Plan tab simply passes no household dishes, so that section stays hidden.
- **Alternatives considered**: A separate calendar panel. Rejected as duplicated code.

## 6. Two-column list

- **Decision**: Use React Native `SectionList` with each row holding two cards, built from a pure helper.
- **Rationale**: It handles section headers and scrolling, and the helper can be unit tested. Lists here are short.
- **Alternatives considered**: FlashList. It is installed but unused in the feature code, and lists this short don't need it. `@gorhom/bottom-sheet` was also passed over because the calendar's existing sheets use `Modal`.

## 7. Mapping the four groups

- **Decision**:

| Section | Source |
|---|---|
| Household picks | Approved and pending dishes for this meal from the calendar store |
| Liked | `options.liked` |
| Newly added | `options.recentlySaved` |
| Possible dishes | `options.suggested` |

- **Rationale**: Household picks include approved dishes nobody has selected yet, so the same dish can't appear lower down and fail as a duplicate when tapped.
- **Alternatives considered**: Showing only dishes with at least one selection. Rejected for that reason.

## 8. Duplicates in the picker

- **Decision**: Remove repeats across sections by option key and by case-insensitive name, keeping the first.
- **Rationale**: The server treats same-named dishes as duplicates, so the client should match it. The household section comes first, so dishes already on the meal win.

## 9. Timer ending while the picker is open

- **Decision**: Rely on the server's fixed-day rejection and show its message in the picker.
- **Rationale**: The server is already the authority, and this avoids a second timer check in the picker. Nothing is submitted.
- **Alternatives considered**: Closing the sheet automatically. Rejected because a person could lose their place with no explanation.

## 10. Button label

- **Decision**: Keep the plus icon before the word, giving `+ Suggest` and `+ Add`.
- **Rationale**: This matches the current `+ Add` button.
