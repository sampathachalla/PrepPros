# Feature Specification: Meal Box and Suggestion Picker

**Feature Branch**: `version-1/calendar-feature`

**Created**: 2026-11-06

**Status**: Draft

**Input**: User description: "In every meal box, we show the household members' selected count, timer, and meal name. Initially, it will show the admin-selected meal in a rectangular box. Later, if someone clicks on Suggest +, it will open a component box containing: meals selected by household members, the liked/saved dishes, newly added dishes, and possible dishes that can be suggested. These dishes will be displayed in a 2×2 list, with tabs at the top for Liked and Search."

## Clarifications

### Session 2026-11-06

- Q: With only two tabs, where do the four dish groups appear? → A: All four appear as labelled sections on the first tab, renamed For you. Search covers all of them.
- Q: Should each box show the timer? → A: No. The time left stays at the top of the day only. This replaces the original request for a timer in every box.
- Q: How many dishes can a person add to a meal? → A: One. Update replaces it with another dish. A member can't replace a dish once the admin approves it.
- Q: Do suggestions need admin approval? → A: Yes. Approval stays as it works today, and other members can only select a suggestion after the admin approves it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See a meal's status at a glance (Priority: P1)

A household member opens a day in the calendar. Each meal (Breakfast, Lunch, Snacks, Dinner) shows the dish the admin selected in a rectangular box. Each box shows the dish name and how many household members have selected it. The time left to answer appears once, at the top of the day.

**Why this priority**: This is the main reason people open the calendar. It delivers value on its own, even before the new picker exists, because everyone can see what is planned and where the household stands without opening anything.

**Independent Test**: Plan a dish for a meal, start the timer, and have one member select the dish. Every household member sees the box with the dish name and a count of "1 of N", and a live countdown at the top of the day.

**Acceptance Scenarios**:

1. **Given** the admin has selected a dish for a meal and the timer is running, **When** a member views that day, **Then** the meal shows a rectangular box with the dish name and the selected count, and the top of the day shows the time left.
2. **Given** a box is on screen, **When** another member selects that dish, **Then** the count updates without the viewer having to reopen the day.
3. **Given** the admin has selected two dishes for a meal, **When** a member views that day, **Then** each dish has its own box with its own count.
4. **Given** the timer ends, **When** a member views that day, **Then** the top of the day no longer shows a countdown and shows that the day is fixed.
5. **Given** no dish has been selected for a meal, **When** anyone views that day, **Then** the meal shows its empty state and no count.

---

### User Story 2 - Suggest a dish from the picker (Priority: P2)

A household member wants something other than the admin's selection. They tap Suggest + on the meal, and a picker opens over the current day. They browse dishes in a two-column list, tap one, and it is submitted as their suggestion for that meal.

**Why this priority**: This is the main new interaction, but it depends on the meal box from User Story 1 being in place.

**Independent Test**: As a member, tap Suggest + on a meal with liked dishes, tap a dish, and confirm it is recorded as a suggestion for that meal without leaving the day.

**Acceptance Scenarios**:

1. **Given** a member is viewing a day they can suggest for, **When** they tap Suggest + on a meal, **Then** a picker opens for that meal while the day stays in place behind it.
2. **Given** the picker is open, **When** the member views it, **Then** dishes appear in a two-column list with For you and Search tabs at the top.
3. **Given** the picker is open, **When** the member taps a dish, **Then** it is submitted as their suggestion, the picker confirms it, and the suggestion appears on that meal.
4. **Given** the picker is open, **When** the member closes it without tapping a dish, **Then** nothing changes on the plan.

---

### User Story 3 - Find any dish with Search (Priority: P3)

A member knows what they want but cannot see it in the list. They switch to the Search tab, type a name, and pick a match. If nothing matches, they can suggest the typed name as a new dish.

**Why this priority**: It covers dishes that are not already in the person's lists. The picker is still useful without it.

**Independent Test**: Open the Search tab, type part of a saved dish's name and confirm it appears. Then type a name with no match and suggest it as a new dish.

**Acceptance Scenarios**:

1. **Given** the Search tab is open, **When** the member types part of a dish name, **Then** matching dishes appear in the two-column list.
2. **Given** no dish matches the text, **When** the member has typed at least 2 characters, **Then** they are offered the choice to suggest that text as a new dish.

---

### Edge Cases

- A dish name is too long for its box: it is shortened with an ellipsis, and the full name stays available to screen readers.
- A list in the picker is empty: it shows a short message saying where dishes come from, rather than a blank area.
- The same dish appears in more than one group: it is shown once, in the first group it belongs to.
- A member picks a dish that is already on that meal: they are not given a duplicate suggestion.
- The timer ends while the picker is open: the member is told the day is fixed, and nothing is submitted.
- Submitting a suggestion fails: the picker stays open, shows an error, and lets the member try again.
- The dish list fails to load: the picker shows an error and does not look empty.
- The admin removes a dish a member had selected: the box disappears and that member no longer counts as having selected it.
- A household has one member: the count reads "1 of 1" or "0 of 1" with no special handling.

## Requirements *(mandatory)*

### Functional Requirements

**Meal box**

- **FR-001**: Each dish the admin has selected for a meal MUST appear in its own rectangular box under that meal, in a two-column grid.
- **FR-002**: Each box MUST show the dish name. Another person's waiting suggestion MUST also appear in the grid, marked as waiting and showing who suggested it, for anyone allowed to see it.
- **FR-003**: Each box MUST show how many household members selected that dish out of the household total, for example "2 of 4".
- **FR-004**: The top of the day MUST show the time left to answer while the timer is running. Individual boxes MUST NOT show it.
- **FR-005**: A fixed day MUST be shown as fixed at the top of the day.
- **FR-006**: A meal with no selected dish MUST show its empty state and no count.
- **FR-007**: Selected counts MUST refresh for all viewers within 15 seconds of a change while the day is on screen.

**Opening the picker**

- **FR-008**: Everyone MUST see an action on each meal while the day is neither past nor fixed. It MUST read Update if the person has a dish on that meal, and Suggest otherwise. A declined dish doesn't count. Update MUST replace that dish, and a member's action MUST disappear once the admin approves their dish. Adding a dish MUST count as the person's pick; a suggestion gets its pick when the admin approves it.
- **FR-009**: The admin MUST be able to open the same picker from that action, and a dish the admin picks MUST go directly onto the plan and appear at the end of the meal's grid.
- **FR-010**: The picker MUST open over the current day, without moving the person to another screen.
- **FR-011**: Closing the picker without picking a dish MUST leave the plan unchanged.

**Picker contents**

- **FR-012**: The picker MUST show dishes in a scrolling two-column list.
- **FR-013**: The picker MUST have For you and Search tabs at the top, and MUST open on For you.
- **FR-014**: The For you tab MUST show labelled sections in this order: dishes selected by household members for this meal, the person's liked and saved dishes, newly added dishes, and possible dishes to suggest. A section with no dishes MUST be hidden.
- **FR-015**: Each dish card MUST show the dish name, and the preparation time when it is known.
- **FR-016**: A dish in more than one group MUST appear only once.
- **FR-017**: The Search tab MUST find matches by dish name across all of the groups.
- **FR-018**: When a search has at least 2 characters, the person MUST be able to submit the typed text as a new dish, up to 150 characters.

**Suggesting**

- **FR-019**: Tapping a dish MUST submit it for that meal, and the person MUST see that it succeeded or failed.
- **FR-020**: A member's suggestion MUST wait for admin approval. Until it is approved, the suggestion MUST show as waiting and other members MUST NOT be able to select it.
- **FR-021**: The system MUST prevent new suggestions once a day is past or fixed, including when the timer ends while the picker is open.

### Key Entities

- **Meal box**: One dish on one meal of one day. Shows the dish name and selected count.
- **Dish**: Something the household can eat. It can come from a recipe, a saved link, an earlier plan, or a typed name.
- **Suggestion**: A dish proposed by a member for a specific meal and day, with a status of waiting, approved, or declined.
- **Selection**: A member's single choice of dish for a meal on a day.
- **Day timer**: The one deadline for answering across all of a day's meals. When it ends, the day becomes fixed.
- **Picker group**: A set of dishes offered in the picker, based on the household's choices and the person's own likes and saves.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person can tell a meal's dish, selected count, and the day's time left within 3 seconds of opening a day, without tapping anything.
- **SC-002**: A member can suggest a dish from their liked list in under 15 seconds, starting from the day view.
- **SC-003**: 90% of test users suggest a dish on their first attempt without help.
- **SC-004**: At least 4 dish cards are visible at once in the picker on a standard phone.
- **SC-005**: A change to a selected count reaches all viewers within 15 seconds.
- **SC-006**: Nobody can submit a suggestion for a fixed or past day.

## Assumptions

- **Target users**: This applies to existing household admins and members on mobile. Roles and permissions stay as they are.
- **Selected count**: The count is per dish. It is the number of members who chose that dish, out of all household members. This replaces the meal-level "answered" count currently beside the meal name.
- **Timer**: This is the existing day timer, which sets how long the household has to answer. It is not a cooking timer. It appears once at the top of the day, not in each box.
- **Timer control**: Admins keep starting and ending the timer the way they do today.
- **2×2 list**: This means a scrolling two-column list, not fixed pages of four.
- **Dish groups**: "Newly added dishes" means the person's recently saved dishes. "Possible dishes to suggest" means the app's existing recommendations for that meal.
- **Saved dishes**: Liked dishes appear in the liked section. Saved links appear under newly added, because the app keeps them as one recent list.
- **Dishes already on the meal**: Tapping an approved dish in the picker selects it while the timer runs. It never creates a second copy.
- **Answering**: Members keep choosing a dish by tapping its box while the timer runs.
- **Draft days**: Members can suggest on a draft day, as they can today, but do not see the admin's unpublished dishes.
- **Existing tools**: The Plan tab is removed. Admins approve or decline suggestions on the dish's box in the Calendar.
- **Out of scope**: Changing the timer durations, recommendation quality, and the shopping list.
