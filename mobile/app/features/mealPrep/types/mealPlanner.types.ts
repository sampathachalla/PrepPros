import type { HouseholdMember, MealCategory } from '../../calendar/types/calendar';

export type SlotPolicyStatus = 'available' | 'reserved';
export type SubmissionStatus = 'draft' | 'submitted' | 'locked';
export type DraftSlotStatus = 'empty' | 'draft' | 'needs_review' | 'ready';
export type WeeklySlotGridMode = 'dish-selection' | 'slot-management' | 'bulk-finalization';
export type DishCatalogFilter = 'liked' | 'recently_added' | 'suggested';
export type BulkAssignStrategy = 'member_complete' | 'union' | 'intersection';

export type MealPlannerSubScreen =
  | 'library'
  | 'weekly-picker'
  | 'slot-details'
  | 'weekly-review'
  | 'manage-slots'
  | 'finalize-menu'
  | 'cook-shop';

export interface SlotCoord {
  date: string; // YYYY-MM-DD (Sunday..Saturday)
  meal: MealCategory; // 'breakfast' | 'lunch' | 'snacks' | 'dinner'
}

export interface CatalogDish {
  dishKey: string;
  name: string;
  imageUrl?: string;
  minutes?: number;
  recipeId?: string | null;
  bookmarkId?: string | null;
  fromDishId?: string | null;
  isLiked: boolean;
  isRecentlyAdded: boolean;
  isSuggested: boolean;
  reason?: string;
  interestedMemberIds: string[];
  ingredients?: string[];
  steps?: string[];
}

export interface ProposalDishItem {
  id?: string;
  dishKey: string;
  name: string;
  imageUrl?: string;
  recipeId?: string | null;
  bookmarkId?: string | null;
  prepMinutes?: number;
  cookMinutes?: number;
  baseServings?: number;
  ingredients?: string[];
  steps?: string[];
}

export interface MealProposal {
  id: string;
  proposerId: string;
  dishes: ProposalDishItem[];
  participantMemberIds: string[];
}

export interface AdminDraftSlot {
  status: DraftSlotStatus;
  sourceNote?: string | null;
  dishes: ProposalDishItem[];
}

export interface PlannerSlotViewModel {
  date: string;
  meal: MealCategory;
  policy: SlotPolicyStatus;
  myChoiceProposalId?: string | null;
  proposals: MealProposal[];
  adminDraft: AdminDraftSlot;
}

export interface MemberSubmissionSummary {
  userId: string;
  status: SubmissionStatus;
  submittedAt?: string | null;
}

export interface WeeklyPlanMeta {
  weekStart: string;
  submissionDeadline?: string | null;
  isDeadlinePassed: boolean;
  publishedVersion: number;
  publishedAt?: string | null;
  hasUnpublishedChanges: boolean;
}

export interface WeekPlanResponse {
  serverTime: string;
  week: WeeklyPlanMeta;
  mySubmission: {
    status: SubmissionStatus;
    submittedAt?: string | null;
  };
  memberSubmissions: MemberSubmissionSummary[];
  slots: PlannerSlotViewModel[];
}

export interface SaveDishSelectionsInput {
  dish: {
    dishKey: string;
    recipeId?: string | null;
    bookmarkId?: string | null;
    fromDishId?: string | null;
    name: string;
    imageUrl?: string;
    minutes?: number;
  };
  addSlots: SlotCoord[];
  removeSlots: SlotCoord[];
}

export type SetSlotChoiceInput =
  | {
      mode: 'join_proposal';
      proposalId: string;
    }
  | {
      mode: 'use_own_meal';
      dishes?: ProposalDishItem[];
    };

export interface UpdateSlotPoliciesInput {
  submissionDeadline?: string | null;
  slots: {
    date: string;
    meal: MealCategory;
    status: SlotPolicyStatus;
  }[];
}

export interface BulkAssignInput {
  dryRun?: boolean;
  slots: SlotCoord[];
  strategy: BulkAssignStrategy;
  sourceMemberIds: string[];
}

export interface BulkAssignAffectedSlot {
  date: string;
  meal: MealCategory;
  status: DraftSlotStatus;
  sourceNote?: string | null;
  dishes: ProposalDishItem[];
}

export interface BulkAssignResult {
  selectedCount: number;
  populatedCount: number;
  emptyCount: number;
  needsReviewCount: number;
  affectedSlots: BulkAssignAffectedSlot[];
}

export interface PublishWeekResult {
  weekStart: string;
  publishedVersion: number;
  publishedAt: string;
  emptySlotsCount: number;
  needsReviewSlotsCount: number;
  emptyReservedSlotsCount: number;
}

export type { HouseholdMember, MealCategory };
