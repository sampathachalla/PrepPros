# Quickstart & Validation Guide: Household Meal Planner

**Feature**: `002-household-meal-planner` | **Date**: 2026-11-07

This guide documents the end-to-end validation scenarios for the Household Meal Planner across the API (`api/`) and Mobile (`mobile/`) workspaces.

## Prerequisites

1. PostgreSQL database running with latest Prisma migrations applied:
   ```bash
   cd api && npx prisma migrate dev
   ```
2. API server running locally:
   ```bash
   cd api && npm run dev
   ```
3. Demo household seeded with an Admin (`Trainer` / `admin`) and at least 2 Household Members (`member`).

---

## End-to-End Validation Scenarios

### Scenario 1: Admin Configures Slot Policies & Submission Deadline (Page 5)
1. Sign in as the household **Admin** and open **Meal Prep → Manage Slots**.
2. Toggle mode to **Reserved**, select **Friday Dinner** and **Saturday Dinner** on the 7 × 4 `WeeklySlotGrid`, and tap **Save Slot Availability**.
3. **Expected**:
   - `PUT /meal-planner/weeks/:weekStart/slot-policies` returns `200 OK`.
   - Friday Dinner and Saturday Dinner display lock icons (`Reserved`).
   - Published Calendar (`/(tabs)/calendar`) remains unchanged (`Menu not finalized`).

### Scenario 2: Members Browse Dish Library & Multi-Select Slots (Pages 1 & 2)
1. Sign in as **Member A**, open **Meal Prep → Dish Library** (`Page 1`).
2. Switch between **Liked**, **Recently Added**, and **Suggested** filters and search for `"Biryani"`.
3. Tap **Chicken Biryani** to open **Dish Weekly Slot Picker** (`Page 2`).
4. Single-tap **Wednesday Lunch** and **Thursday Dinner** in the 7 × 4 grid:
   - Verify no network request is sent on single-tap highlight.
   - Verify the bottom bar updates to **"Add Chicken Biryani to 2 slots"**.
5. Attempt to tap **Friday Dinner** (Reserved):
   - Verify the slot cannot be selected for editing by Member A.
6. Tap **"Add Chicken Biryani to 2 slots"**.
7. **Expected**:
   - `POST /meal-planner/weeks/:weekStart/dish-selections` saves the draft selections and updates avatar indicators on both cells.

### Scenario 3: Inspect Household Choices & Join a Complete Meal Bundle (Page 3)
1. While in **Dish Weekly Slot Picker** (`Page 2`) as **Member B**, double-tap **Wednesday Lunch** (or select it and tap **"View household choices"**).
2. **Expected**:
   - Single-tap selection does not accidentally flip.
   - **Meal Slot Details** (`Page 3`) opens for Wednesday Lunch showing Member A's complete meal bundle (e.g., `Rice • Tomato Dal • Sambar • Curd`) with participant avatars.
3. Tap **"I'll eat this meal"** on Member A's proposal card and confirm.
4. **Expected**:
   - `PUT /meal-planner/slots/:date/:meal/choice` sets Member B's `MemberSlotChoice` to Member A's proposal (`2 members joined`).
   - Navigating back to Page 2 preserves any unsaved local selections for other slots.

### Scenario 4: Member Weekly Review & Submission Before Cutoff (Page 4)
1. Open **My Weekly Review** (`Page 4`) as Member B.
2. Verify Wednesday Lunch lists Member A's joined bundle (`Rice, Tomato Dal, Sambar, Curd`) and status badge reads **Draft**.
3. Tap **Submit Weekly Meal Plan**.
4. **Expected**:
   - `POST /meal-planner/weeks/:weekStart/submit` marks status as **Submitted**.
   - Member B can still edit unreserved slots while `submissionDeadline` has not passed; once `submissionDeadline` passes, server returns `409 Conflict` on member edits.

### Scenario 5: Admin Finalizes Weekly Menu (Bulk Grid + Daily Review) & Publishes (Page 6 → Calendar)
1. Sign in as **Admin** and open **Finalize Weekly Menu** (`Page 6`).
2. In **Bulk Grid** mode:
   - Select Monday–Thursday Lunch slots.
   - Choose **"Use Member A's complete meals"** in `MealSourceSelector` and inspect the preview (`selectedCount`, `populatedCount`, `emptyCount`).
   - Confirm to apply to the admin's `WeeklyMenuDraftSlot`.
   - Select Thursday Dinner, run **"Combine selected members' dishes"** (or **"Find common dishes"**), and verify the slot status becomes **Needs Review**.
3. Toggle to **Daily Review** mode:
   - Verify the 7-day carousel reflects all Bulk Grid assignments without losing state.
   - Swipe to Thursday, tap **"Edit Dishes"** on Dinner, adjust the dishes in the scoped 2-column `DishGrid`, and return to the carousel (slot status becomes **Ready**).
4. Tap **"Publish Weekly Menu"** and confirm any empty-slot warning.
5. Open the **Calendar** tab (`/(tabs)/calendar`) as both Admin and Member B.
6. **Expected**:
   - Both users see the exact same finalized dishes across Sunday–Saturday in a 2-column read-only grid.
   - Subsequent edits in Page 6 (Admin Finalize) set `hasUnpublishedChanges = true` without altering the Published Calendar until republished.

---

## Automated Verification Commands (When Explicitly Requested)

Per project rules, do **not** run test suites automatically unless requested. When requested by the user:
- **API contract & integration tests**: `cd api && npm test -- tests/mealPlanner.test.ts`
- **Mobile unit tests**: `cd mobile && npm test -- app/features/mealPrep/__tests__/`
- **Typecheck**: `cd api && npx tsc --noEmit` and `cd mobile && npx tsc --noEmit`
