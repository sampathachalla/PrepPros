# Contract: Backend REST API (`/calendar` & `/meal-planner`)

**Feature**: `002-household-meal-planner` | **Date**: 2026-11-07

All endpoints require Bearer JWT authentication (`requireAuth`) and household membership (`requireMembership`). All dates use explicit calendar-date strings (`YYYY-MM-DD`); `weekStart` must be a Sunday (`YYYY-MM-DD`).

---

## 1. Published Calendar API (`/calendar`)

### `GET /calendar?from=YYYY-MM-DD&to=YYYY-MM-DD`
Returns **only** the admin-published menu for the requested date range. Draft member proposals and unpublished `WeeklyMenuDraftSlot` changes are never returned here.

**Response `200 OK`**:
```json
{
  "serverTime": "2026-11-07T22:00:00.000Z",
  "days": [
    {
      "date": "2026-11-08",
      "status": "fixed",
      "publishedVersion": 2,
      "publishedAt": "2026-11-07T20:15:00.000Z"
    }
  ],
  "dishes": [
    {
      "id": "uuid",
      "date": "2026-11-08",
      "category": "lunch",
      "name": "Chicken Biryani",
      "imageUrl": "https://...",
      "prepMinutes": 30,
      "cookMinutes": 45,
      "recipeId": "uuid",
      "bookmarkId": null,
      "memberIds": ["uuid-1", "uuid-2", "uuid-3"],
      "createdAt": "2026-11-07T20:15:00.000Z"
    }
  ]
}
```
*Note*: If a week has `publishedVersion === 0` (unpublished), `days` returns `status: "draft"` with zero `dishes` for those dates so the mobile Calendar screen renders `"Menu not finalized"`.

---

## 2. Collaborative Meal Planner API (`/meal-planner`)

### 2.1 `GET /meal-planner/dishes?weekStart=YYYY-MM-DD&filter=liked|recently_added|suggested&q=<search>`
Returns the unified, deduplicated dish catalog for Page 1 (Dish Library) and Page 6 Mode B ("Edit Dishes" picker).

**Response `200 OK`**:
```json
{
  "weekStart": "2026-11-08",
  "dishes": [
    {
      "dishKey": "recipe:uuid-1",
      "name": "Chicken Biryani",
      "imageUrl": "https://...",
      "minutes": 75,
      "recipeId": "uuid-1",
      "bookmarkId": null,
      "fromDishId": null,
      "isLiked": true,
      "isRecentlyAdded": false,
      "isSuggested": true,
      "reason": "Your household had this",
      "interestedMemberIds": ["user-1", "user-2", "user-3"]
    }
  ]
}
```

### 2.2 `GET /meal-planner/weeks/:weekStart`
Returns the complete collaborative planning state for the 28 slots of `weekStart` (Sunday–Saturday × `breakfast`, `lunch`, `snacks`, `dinner`). Used by Pages 2, 3, 4, 5, and 6.

**Response `200 OK`**:
```json
{
  "serverTime": "2026-11-07T22:00:00.000Z",
  "week": {
    "weekStart": "2026-11-08",
    "submissionDeadline": "2026-11-07T23:59:59.000Z",
    "isDeadlinePassed": false,
    "publishedVersion": 1,
    "publishedAt": "2026-11-06T18:00:00.000Z",
    "hasUnpublishedChanges": true
  },
  "mySubmission": {
    "status": "draft",
    "submittedAt": null
  },
  "memberSubmissions": [
    { "userId": "user-1", "status": "submitted", "submittedAt": "2026-11-07T19:00:00.000Z" }
  ],
  "slots": [
    {
      "date": "2026-11-11",
      "meal": "lunch",
      "policy": "available",
      "myChoiceProposalId": "proposal-rahul",
      "proposals": [
        {
          "id": "proposal-rahul",
          "proposerId": "user-rahul",
          "dishes": [
            { "id": "pd-1", "dishKey": "recipe:1", "name": "Rice", "imageUrl": "https://..." },
            { "id": "pd-2", "dishKey": "recipe:2", "name": "Tomato Dal", "imageUrl": "https://..." }
          ],
          "participantMemberIds": ["user-rahul", "user-priya", "user-me"]
        }
      ],
      "adminDraft": {
        "status": "ready",
        "sourceNote": "Rahul's meal",
        "dishes": [
          { "id": "dd-1", "dishKey": "recipe:1", "name": "Rice", "imageUrl": "https://..." },
          { "id": "dd-2", "dishKey": "recipe:2", "name": "Tomato Dal", "imageUrl": "https://..." }
        ]
      }
    }
  ]
}
```

### 2.3 `POST /meal-planner/weeks/:weekStart/dish-selections` (Page 2 — Multi-Slot Dish Booking)
Adds or removes a dish across one or more `(date, meal)` slots for the current member's own proposals in a single atomic transaction.

**Request Body**:
```json
{
  "dish": {
    "dishKey": "recipe:uuid-1",
    "recipeId": "uuid-1",
    "bookmarkId": null,
    "fromDishId": null,
    "name": "Chicken Biryani"
  },
  "addSlots": [
    { "date": "2026-11-11", "meal": "dinner" },
    { "date": "2026-11-13", "meal": "dinner" }
  ],
  "removeSlots": []
}
```
**Validation & Behavior**:
- Rejects with `409` if `submissionDeadline` has passed (for non-admin) or if any target slot has `policy === 'reserved'` (for non-admin).
- Upserts the caller's `MealProposal` for each slot in `addSlots`, appends the dish if not already in that proposal, and sets the caller's `MemberSlotChoice` for that slot to their own proposal.
- Removes the dish from the caller's `MealProposal` for each slot in `removeSlots`.

### 2.4 `PUT /meal-planner/slots/:date/:meal/choice` (Page 3 — Join Proposal or Keep Own Meal)
Sets the caller's active meal choice for `(date, meal)`.

**Request Body**:
```json
{
  "mode": "join_proposal",
  "proposalId": "proposal-rahul"
}
```
or
```json
{
  "mode": "use_own_meal",
  "dishes": [
    { "dishKey": "recipe:uuid-1", "recipeId": "uuid-1", "name": "Biryani" }
  ]
}
```
**Validation & Behavior**:
- Rejects with `409` if slot is `reserved` (for non-admin) or deadline has passed.
- Updates `MemberSlotChoice` (`@@id([householdId, date, meal, userId])`) so the member has exactly one active proposal choice for that slot.

### 2.5 `POST /meal-planner/weeks/:weekStart/submit` (Page 4 — Submit Weekly Meal Plan)
Marks the caller's weekly plan as `submitted`.

**Response `200 OK`**:
```json
{
  "weekStart": "2026-11-08",
  "status": "submitted",
  "submittedAt": "2026-11-07T22:10:00.000Z"
}
```

### 2.6 `PUT /meal-planner/weeks/:weekStart/slot-policies` (Page 5 — Admin Manage Slots)
Admin-only endpoint to update slot policies (`available` | `reserved`) and optionally `submissionDeadline` atomically.

**Request Body**:
```json
{
  "submissionDeadline": "2026-11-07T23:59:59.000Z",
  "slots": [
    { "date": "2026-11-13", "meal": "dinner", "status": "reserved" },
    { "date": "2026-11-14", "meal": "dinner", "status": "reserved" }
  ]
}
```
**Validation & Behavior**:
- Requires `admin` role (`403` otherwise).
- Preserves existing `MealProposal` and `MemberSlotChoice` rows in history.
- Does not publish or alter the Published Calendar.

### 2.7 `POST /meal-planner/weeks/:weekStart/bulk-assign` (Page 6 Mode A — Admin Bulk Grid)
Admin-only endpoint to preview (`dryRun: true`) or apply (`dryRun: false`) a bulk assignment across selected slots on `WeeklyMenuDraftSlot`.

**Request Body**:
```json
{
  "dryRun": false,
  "slots": [
    { "date": "2026-11-09", "meal": "lunch" },
    { "date": "2026-11-11", "meal": "lunch" }
  ],
  "strategy": "member_complete",
  "sourceMemberIds": ["user-rahul"]
}
```
- `strategy`:
  - `"member_complete"`: Copies `sourceMemberIds[0]`'s active proposal into each selected slot where that member submitted one (`status = 'ready'`). Slots where that member has no proposal remain unfilled and are returned in `unfilledSlots`.
  - `"union"`: Combines distinct dishes from all `sourceMemberIds` in each selected slot and marks populated slots as `status = 'needs_review'`.
  - `"intersection"`: Finds common dishes across `sourceMemberIds` in each selected slot, labels `sourceNote = "Common dishes"`, and marks populated slots as `status = 'needs_review'`.

**Response `200 OK`**:
```json
{
  "selectedCount": 2,
  "populatedCount": 1,
  "emptyCount": 1,
  "needsReviewCount": 0,
  "affectedSlots": [
    {
      "date": "2026-11-11",
      "meal": "lunch",
      "status": "ready",
      "dishes": [{ "dishKey": "recipe:1", "name": "Rice" }, { "dishKey": "recipe:2", "name": "Tomato Dal" }]
    },
    {
      "date": "2026-11-09",
      "meal": "lunch",
      "status": "empty",
      "dishes": []
    }
  ]
}
```

### 2.8 `PUT /meal-planner/slots/:date/:meal/draft` (Page 6 Mode B — Admin Daily Review Slot Edit)
Admin-only endpoint to set the draft dishes for a single `(date, meal)` slot and mark its draft status (`ready` | `empty`).

**Request Body**:
```json
{
  "dishes": [
    { "dishKey": "recipe:1", "recipeId": "uuid-1", "name": "Rice" },
    { "dishKey": "recipe:2", "recipeId": "uuid-2", "name": "Tomato Dal" }
  ]
}
```

### 2.9 `POST /meal-planner/weeks/:weekStart/publish` (Page 6 — Publish Weekly Menu)
Admin-only endpoint to publish the current `WeeklyMenuDraftSlot` state to the household Calendar.

**Request Body**:
```json
{
  "allowIncomplete": true
}
```
**Validation & Behavior**:
- If any of the 28 slots (or any `reserved` slot) is `empty` or `needs_review` and `allowIncomplete !== true`, returns `409 Conflict` with `{ emptySlotsCount, needsReviewSlotsCount, emptyReservedSlotsCount }` so the mobile UI can display the confirmation override dialog.
- When confirmed (`allowIncomplete: true` or all slots `ready`), atomically snapshots `WeeklyMenuDraftDish` into the published Calendar (`MealDay` + `PlannedDish`), increments `WeeklyPlan.publishedVersion`, and clears `hasUnpublishedChanges`.
