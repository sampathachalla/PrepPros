# Feature Specification: Household Meal Planner

**Feature Branch**: `version-1/feature/calendar`

**Created**: 2026-11-07

**Status**: Draft

**Input**: Consolidated UX and behavior specification ("Household Meal Planner | Design Draft" PDF and "Meal Planner — Step-by-Step UI Implementation Guide"): separating the read-only Published Calendar from the collaborative Meal Prep workflow (Dish Library, Dish Weekly Slot Picker, Meal Slot / Household Choices, My Weekly Review, Admin Manage Slots, and Admin Finalize Weekly Menu with Bulk Grid and Daily Review Carousel modes).

## Clarifications & Confirmed Design Proposals

### Session 2026-11-07

- **Q1: Does joining another member's bundle replace your previous choice or allow multiple bundles for one slot?** → **Proposal adopted**: One active complete meal proposal (bundle) per person per slot. Joining another member's proposal replaces the member's previous choice for that slot after confirmation when switching; a member's own proposal can contain multiple constituent dishes.
- **Q2: Does a reserved slot require a published fixed menu immediately, or can the admin reserve first and fill later?** → **Proposal adopted**: Reserve-first is allowed. Admin can mark slots as `reserved` in Manage Slots and assign dishes later during finalization; attempting to publish a weekly menu with an empty reserved slot triggers an explicit warning (with intentional override permitted).
- **Q3: How to handle incomplete meals in bulk review (union / intersection)?** → **Proposal adopted**: Warnings and manual correction in the admin draft (no automatic nutritional/completeness inference). Union and intersection results are marked `needs_review` until inspected or edited by the admin before publication.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Published Calendar (Priority: P1)

Every household member opens the Calendar tab to get a simple, read-only answer to "what are we eating today?" without draft noise or voting controls.

**Why this priority**: Separates daily consumption of the finalized household menu from weekly collaborative planning, ensuring draft edits never silently alter the published calendar.

**Independent Test**: Publish a weekly menu as admin, then view the Calendar tab as both admin and regular member across Sunday–Saturday. Verify only published dishes appear in a two-column grid under Breakfast, Lunch, Snacks, and Dinner, and unpublished days show "Menu not finalized".

**Acceptance Scenarios**:

1. **Given** the admin has published the menu for a week, **When** any household member opens Calendar and selects or swipes across Sunday–Saturday, **Then** Breakfast, Lunch, Snacks, and Dinner display the published dishes in a two-column grid within a single vertical scroll.
2. **Given** a dish is shown on the Published Calendar, **When** a member taps the dish card, **Then** its recipe/dish details open without exposing draft suggestion or voting controls.
3. **Given** the admin has not yet published a week's menu (or is editing an unpublished draft), **When** a member views that week in Calendar, **Then** the screen displays "Menu not finalized" rather than leaking draft proposals.

---

### User Story 2 - Browse Dish Library & Multi-Select Weekly Slots (Priority: P1)

A household member (or admin) opens Meal Prep → Dish Library, searches or filters dishes (`Liked`, `Recently Added`, `Suggested`) over a single unified dish catalog, taps a dish to open the 7 × 4 Dish Weekly Slot Picker, selects one or more meal slots across Sunday–Saturday, and adds the dish to their draft weekly plan.

**Why this priority**: Forms the core foundation (Page 1 Dish Library + Page 2 shared `WeeklySlotGrid`) for adding dishes across multiple days and meals in one booking-style operation.

**Independent Test**: Filter and search the two-column Dish Library, tap "Chicken Biryani", single-tap Wednesday Dinner and Friday Dinner in the 7 × 4 grid, and tap "Add to 2 slots". Verify selections are saved to the member's draft proposals without immediately mutating on single-tap highlight.

**Acceptance Scenarios**:

1. **Given** a member opens Dish Library for a planning week, **When** they switch between `Liked`, `Recently Added`, and `Suggested` or type a search query, **Then** dishes render in a two-column photo grid with dish names and compact household member interest indicators without duplicating catalog records.
2. **Given** a member taps a dish card in Dish Library, **When** Dish Weekly Slot Picker opens, **Then** a 7 (Sun–Sat) × 4 (Breakfast, Lunch, Snack, Dinner) grid displays existing selections, lock icons for admin-reserved slots, and compact household participation avatars/counts.
3. **Given** a member single-taps cells in the 7 × 4 grid, **When** exactly 1 slot is selected, **Then** a contextual Add action is shown; **When** multiple slots are selected, **Then** a prominent bottom button "Add to N slots" is shown, and nothing is written to the backend until explicit Add confirmation.
4. **Given** a slot is marked `reserved` by the admin, **When** a regular member taps it, **Then** they can inspect it but cannot add or edit dishes in that slot.

---

### User Story 3 - Inspect Meal Slot & Join a Household Proposal (Priority: P2)

From the 7 × 4 Weekly Slot Picker, a member double-taps a cell (or taps the accessible "View household choices" action) to open Page 3 (Meal Slot / Household Choices). They view complete meal combinations grouped by proposer (e.g., `Rice • Tomato Dal • Sambar • Curd`) and either tap `"I'll eat this meal"` to join an existing bundle or `"Keep my own meal"` to retain/build their own combination.

**Why this priority**: Enables household transparency and convergence around shared meals rather than fragmented single-dish votes.

**Independent Test**: Have Member A propose a 3-dish bundle for Wednesday Lunch. Open Wednesday Lunch in Meal Slot Details as Member B, tap `"I'll eat this meal"` on Member A's card, and confirm Member B's choice for Wednesday Lunch updates to Member A's proposal and increments the participant count.

**Acceptance Scenarios**:

1. **Given** Dish Weekly Slot Picker is open, **When** a user double-taps a slot cell or taps "View household choices", **Then** single-tap selection is not accidentally toggled, and Meal Slot Details opens for that day and meal while preserving unsaved grid selections on back navigation.
2. **Given** Meal Slot Details is open for an available slot, **When** household proposals exist, **Then** each proposal renders as a single bundle card showing the proposer, all constituent dishes, and participating member avatars/counts.
3. **Given** a member taps `"I'll eat this meal"` on another member's proposal, **When** confirmed, **Then** it replaces their active choice for that slot and synchronizes with Page 2 (Slot Picker) and Page 4 (My Weekly Review).
4. **Given** the slot is admin-reserved, **When** a member opens Meal Slot Details, **Then** the admin's fixed menu is shown as read-only and join/edit/replace buttons are hidden.

---

### User Story 4 - Review & Submit Weekly Plan Before Deadline (Priority: P2)

A member opens Page 4 (My Weekly Review) to inspect all their chosen meal combinations grouped by day and meal, jump back to edit any slot, and tap `"Submit Weekly Meal Plan"` before the submission deadline.

**Why this priority**: Gives members a clear checkpoint to finalize their weekly preferences and signals to the admin which members are ready for weekly finalization.

**Independent Test**: Review draft selections across Monday–Sunday, tap "Submit Weekly Meal Plan", verify status changes to `Submitted`, edit a slot while the deadline is still open, and verify editing is locked once the deadline passes.

**Acceptance Scenarios**:

1. **Given** a member has draft selections for the week, **When** they open My Weekly Review, **Then** their complete dish combinations are listed by day and meal alongside the submission deadline and Edit actions.
2. **Given** the submission deadline has not passed, **When** the member taps `"Submit Weekly Meal Plan"`, **Then** their weekly submission status changes from `draft` to `submitted` (even if some slots are empty), and they can still edit open unreserved slots until the deadline or admin lock.
3. **Given** the submission deadline has passed, **When** a member views My Weekly Review or Slot Picker, **Then** member editing is locked by the server and submitted choices are routed to the admin review queue.

---

### User Story 5 - Admin Manage Slots (Priority: P2)

The household admin opens Page 5 (Manage Slots), toggles between `Available` and `Reserved` modes on the shared 7 × 4 `WeeklySlotGrid`, selects slots (e.g., Friday and Saturday Dinner), previews affected member selections, and saves slot availability atomically.

**Why this priority**: Lets the admin lock specific meals (such as dining out or fixed family meals) without mixing slot policy controls into menu finalization.

**Independent Test**: As admin, select Friday Dinner (which already has a member proposal) in Manage Slots, switch it to Reserved, confirm the warning dialog, and verify members can no longer edit Friday Dinner while prior member proposals remain preserved in history.

**Acceptance Scenarios**:

1. **Given** an admin opens Manage Slots, **When** they select multiple slots and toggle `Reserved` or `Available`, **Then** a summary shows reserved vs available counts and previews any slots with existing member proposals.
2. **Given** reserving selected slots affects existing member selections, **When** the admin taps `"Save Slot Availability"`, **Then** a confirmation prompt appears, and saving updates slot policies atomically without erasing historical member proposals or auto-publishing the weekly menu.

---

### User Story 6 - Admin Finalize & Publish Weekly Menu (Priority: P1)

The household admin opens Page 6 (Finalize Weekly Menu) and switches seamlessly between **Mode A (Bulk Grid)** and **Mode B (Daily Review Carousel)** over the same unpublished weekly menu draft, then publishes the finalized menu to the household Calendar.

**Why this priority**: Gives the admin fast bulk assignment across 28 slots plus a 7-day visual pass to fix gaps and publish with confidence.

**Independent Test**: In Bulk Grid mode, select 4 lunch slots, apply Member A's proposals, preview populated vs empty slots, and confirm. Switch to Daily Review Carousel, tap "Edit Dishes" on an empty or `Needs Review` slot to add a dish from the 2-column picker, then tap "Publish Weekly Menu" and verify the Calendar updates for all household members.

**Acceptance Scenarios**:

1. **Given** Finalize Weekly Menu is in Bulk Grid mode, **When** the admin selects multiple slots and chooses a source (`Use Member X's complete meals`, `Combine selected members' dishes`, or `Find common dishes`), **Then** a preview shows selected slots, populated slots, empty slots, and affected dishes before applying to the draft.
2. **Given** the admin applies a union or intersection operation in Bulk Grid, **When** the draft updates, **Then** combined or partial results are flagged as `Needs Review` (`needs_review`) rather than auto-finalized.
3. **Given** the admin switches to Daily Review Carousel, **When** they swipe across the 7 daily cards and tap `"Edit Dishes"` on a meal, **Then** the reused two-column dish grid opens with requested household dishes shown first plus catalog search/add, and changes persist when switching back to Bulk Grid.
4. **Given** the admin taps `"Publish Weekly Menu"`, **When** any slots are empty or flagged `Needs Review`, **Then** a warning dialog lists the gaps and allows intentional override; upon confirmation, a published snapshot is saved and becomes live in the read-only Calendar.

---

### Edge Cases

- **Double-tap vs single-tap race on `WeeklySlotGrid`**: Single-tap selection toggle is deferred until the double-tap detection window (~220ms) resolves, and an explicit `"View household choices"` button provides a zero-gesture-timing accessible alternative.
- **Member joins a proposal when they already proposed their own**: Replacing their active slot choice links their selection to the joined proposal while keeping their own draft proposal recoverable if they tap `"Keep my own meal"` before deadline closure.
- **Bulk copy where the chosen source member submitted nothing for a selected slot**: That slot remains unfilled and is visibly flagged in the preview and grid rather than overwriting with an empty meal or throwing an error.
- **Editing admin draft after already publishing v1 of the week's menu**: Admin edits mutate the working `WeeklyMenuDraft` (`unpublishedChanges = true`) without altering the live Published Calendar until `"Publish Weekly Menu"` is pressed again.
- **Deadline expires while a member has Dish Weekly Slot Picker open**: Server rejects write operations with `409 Conflict` ("Planning window for this week has closed"), and UI transitions to read-only state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST separate the Published Calendar (read-only finalized menu) from Meal Prep planning drafts and member proposals.
- **FR-002**: The Dish Library MUST display a two-column image grid with search, `+ Add new dish`, and three filter views (`Liked`, `Recently Added`, `Suggested`) over one unified dish catalog without duplicating records.
- **FR-003**: A single reusable `WeeklySlotGrid` component MUST power all three 7 × 4 grid workflows via an explicit `mode` prop (`dish-selection`, `slot-management`, `bulk-finalization`).
- **FR-004**: In `dish-selection` mode, `WeeklySlotGrid` MUST buffer slot selections locally on single tap, show contextual single-slot or bottom multi-slot `"Add to N slots"` actions, coordinate double-tap navigation to Meal Slot Details without accidental selection, and provide an accessible `"View household choices"` action.
- **FR-005**: Meal Slot Details MUST group dishes into complete meal proposals per member, display proposer info and joined member avatars/counts, and support `"I'll eat this meal"` (one active proposal choice per member per slot) and `"Keep my own meal"`.
- **FR-006**: My Weekly Review MUST display a member's chosen meal bundles across all 7 days × 4 meals, display the weekly submission deadline, allow slot editing before cutoff, and transition submission status from `draft` to `submitted` (and `locked` after cutoff).
- **FR-007**: Admin Manage Slots MUST allow the household admin to toggle slots between `available` and `reserved`, warn when reserving slots with existing member proposals, preserve historical member proposals, and save slot policies atomically.
- **FR-008**: Admin Finalize Weekly Menu MUST provide a state-preserving mode toggle between `Bulk Grid` (multi-slot assignment from a member's proposals, union, or intersection with preview and `Needs Review` flagging) and `Daily Review Carousel` (7 swipeable daily cards with inline `"Edit Dishes"` opening the scoped 2-column dish picker).
- **FR-009**: Publishing a weekly menu MUST warn on empty or `Needs Review` slots (allowing admin override) and write a versioned published menu snapshot that drives the read-only Calendar.
- **FR-010**: The backend API MUST enforce household membership, admin role permissions, slot reservation locks, and weekly submission deadlines on every mutation.

### Key Entities

- **Dish**: Reusable catalog record (`Recipe`, `Bookmark`, or household `PlannedDish` template) with stable identifier, title, image URL, prep/cook time, and household interest metadata.
- **WeeklyPlan**: Household planning container for a specific `weekStart` (Sunday `YYYY-MM-DD`), tracking `submissionDeadline`, `publishedAt`, `publishedVersion`, and `hasUnpublishedChanges`.
- **MealSlotPolicy**: Per-slot (`householdId + date + meal`) availability policy (`available` | `reserved`) controlled by the admin.
- **MealProposal**: One member's proposed bundle of dishes (`MealProposalDish[]`) for a single `(householdId, date, meal)` slot.
- **MemberSlotChoice**: Records which `MealProposal` a household member has chosen to eat for a given `(householdId, date, meal)` slot (one active choice per member per slot).
- **MemberWeeklySubmission**: Tracks a member's weekly plan status (`draft` | `submitted` | `locked`) and `submittedAt` timestamp for a given `(householdId, weekStart, userId)`.
- **WeeklyMenuDraftSlot**: Admin's working finalized dish list and review status (`empty` | `draft` | `needs_review` | `ready`) for a slot prior to publication.
- **PublishedMealSlot**: Versioned snapshot of finalized dishes for `(householdId, date, meal)` displayed in the read-only Calendar.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 6 Meal Prep screens plus the updated read-only Calendar share a single `WeeklySlotGrid`, `DishGrid`/`DishCard`, and `ContributorAvatarStack` implementation with zero duplicate 7 × 4 grid components.
- **SC-002**: Single-tap slot selection in `WeeklySlotGrid` triggers 0 network writes until the user taps the explicit Add CTA, and double-tap opens Meal Slot Details with 0 unintended selection mutations.
- **SC-003**: 100% of unauthorized mutations (member editing a `reserved` slot, member editing after `submissionDeadline`, non-admin calling slot-management or finalization endpoints, or draft edits leaking into Published Calendar) are rejected by the backend API with appropriate 403/409 errors.
