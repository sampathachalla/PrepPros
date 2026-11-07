import { prisma } from '../../config/db.js';
import type { DraftSlotStatus, MealType, Prisma, SlotPolicyStatus, SubmissionStatus } from '../../generated/prisma/client.js';

export function findWeeklyPlan(householdId: string, weekStart: Date) {
  return prisma.weeklyPlan.findUnique({
    where: { householdId_weekStart: { householdId, weekStart } },
  });
}

export function upsertWeeklyPlan(
  householdId: string,
  weekStart: Date,
  update: Prisma.WeeklyPlanUncheckedUpdateInput = {},
) {
  return prisma.weeklyPlan.upsert({
    where: { householdId_weekStart: { householdId, weekStart } },
    create: {
      householdId,
      weekStart,
      ...(typeof update.submissionDeadline !== 'undefined'
        ? { submissionDeadline: update.submissionDeadline as Date | null }
        : {}),
      ...(typeof update.hasUnpublishedChanges === 'boolean'
        ? { hasUnpublishedChanges: update.hasUnpublishedChanges }
        : {}),
    },
    update,
  });
}

export function findWeekSlotPolicies(householdId: string, start: Date, end: Date) {
  return prisma.mealSlotPolicy.findMany({
    where: { householdId, date: { gte: start, lte: end } },
  });
}

export function findSlotPolicy(householdId: string, date: Date, meal: MealType) {
  return prisma.mealSlotPolicy.findUnique({
    where: { householdId_date_meal: { householdId, date, meal } },
  });
}

export function findWeekProposals(householdId: string, start: Date, end: Date) {
  return prisma.mealProposal.findMany({
    where: { householdId, date: { gte: start, lte: end } },
    include: {
      dishes: { orderBy: { position: 'asc' } },
      choices: { select: { userId: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export function findSlotProposals(householdId: string, date: Date, meal: MealType) {
  return prisma.mealProposal.findMany({
    where: { householdId, date, meal },
    include: {
      dishes: { orderBy: { position: 'asc' } },
      choices: { select: { userId: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export function findProposalById(householdId: string, proposalId: string) {
  return prisma.mealProposal.findFirst({
    where: { id: proposalId, householdId },
    include: {
      dishes: { orderBy: { position: 'asc' } },
      choices: { select: { userId: true } },
    },
  });
}

export function findWeekChoices(householdId: string, start: Date, end: Date) {
  return prisma.memberSlotChoice.findMany({
    where: { householdId, date: { gte: start, lte: end } },
  });
}

export function findWeekSubmissions(householdId: string, weekStart: Date) {
  return prisma.memberWeeklySubmission.findMany({
    where: { householdId, weekStart },
  });
}

export function findMemberSubmission(householdId: string, weekStart: Date, userId: string) {
  return prisma.memberWeeklySubmission.findUnique({
    where: { householdId_weekStart_userId: { householdId, weekStart, userId } },
  });
}

export function upsertMemberSubmission(
  householdId: string,
  weekStart: Date,
  userId: string,
  status: SubmissionStatus,
  submittedAt?: Date | null,
) {
  return prisma.memberWeeklySubmission.upsert({
    where: { householdId_weekStart_userId: { householdId, weekStart, userId } },
    create: {
      householdId,
      weekStart,
      userId,
      status,
      submittedAt: submittedAt ?? null,
    },
    update: {
      status,
      ...(typeof submittedAt !== 'undefined' ? { submittedAt } : {}),
    },
  });
}

export function lockExpiredSubmissions(householdId: string, weekStart: Date) {
  return prisma.memberWeeklySubmission.updateMany({
    where: { householdId, weekStart, status: { in: ['draft', 'submitted'] } },
    data: { status: 'locked' },
  });
}

export function findWeekDraftSlots(householdId: string, start: Date, end: Date) {
  return prisma.weeklyMenuDraftSlot.findMany({
    where: { householdId, date: { gte: start, lte: end } },
    include: {
      dishes: { orderBy: { position: 'asc' } },
    },
  });
}

export function findHouseholdBookmarks(memberIds: string[]) {
  return prisma.bookmark.findMany({
    where: { userId: { in: memberIds }, awaitingContent: false },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
  });
}

export function findCatalogAndHouseholdRecipes(memberIds: string[]) {
  return prisma.recipe.findMany({
    where: { OR: [{ ownerId: null }, { ownerId: { in: memberIds } }] },
    include: {
      ingredients: { orderBy: { position: 'asc' } },
      steps: { orderBy: { stepNumber: 'asc' } },
    },
    orderBy: { title: 'asc' },
  });
}

export function findLikedMeals(memberIds: string[]) {
  return prisma.likedMeal.findMany({
    where: { userId: { in: memberIds } },
  });
}

export function findSuggestedMeals(memberIds: string[]) {
  return prisma.suggestedMeal.findMany({
    where: { userId: { in: memberIds } },
    orderBy: { score: 'desc' },
  });
}

export function findHouseholdHistoricalDishes(householdId: string) {
  return prisma.plannedDish.findMany({
    where: { householdId, status: 'approved' },
    orderBy: { date: 'desc' },
    take: 60,
  });
}

export function saveSlotPoliciesTransaction(
  householdId: string,
  weekStart: Date,
  updatedById: string,
  submissionDeadline: Date | null | undefined,
  slots: { date: Date; meal: MealType; status: SlotPolicyStatus }[],
) {
  return prisma.$transaction(async (tx) => {
    if (typeof submissionDeadline !== 'undefined') {
      await tx.weeklyPlan.upsert({
        where: { householdId_weekStart: { householdId, weekStart } },
        create: { householdId, weekStart, submissionDeadline },
        update: { submissionDeadline },
      });
    }
    for (const slot of slots) {
      await tx.mealSlotPolicy.upsert({
        where: {
          householdId_date_meal: {
            householdId,
            date: slot.date,
            meal: slot.meal,
          },
        },
        create: {
          householdId,
          date: slot.date,
          meal: slot.meal,
          status: slot.status,
          updatedById,
        },
        update: {
          status: slot.status,
          updatedById,
        },
      });
    }
  });
}

export function writeDraftSlotDishesTransaction(
  householdId: string,
  weekStart: Date,
  entries: {
    date: Date;
    meal: MealType;
    status: DraftSlotStatus;
    sourceNote?: string | null;
    dishes: {
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
    }[];
  }[],
) {
  return prisma.$transaction(async (tx) => {
    const existingPlan = await tx.weeklyPlan.findUnique({
      where: { householdId_weekStart: { householdId, weekStart } },
    });
    await tx.weeklyPlan.upsert({
      where: { householdId_weekStart: { householdId, weekStart } },
      create: {
        householdId,
        weekStart,
        hasUnpublishedChanges: (existingPlan?.publishedVersion ?? 0) > 0,
      },
      update: {
        hasUnpublishedChanges: (existingPlan?.publishedVersion ?? 0) > 0,
      },
    });

    for (const entry of entries) {
      await tx.weeklyMenuDraftSlot.upsert({
        where: {
          householdId_date_meal: {
            householdId,
            date: entry.date,
            meal: entry.meal,
          },
        },
        create: {
          householdId,
          date: entry.date,
          meal: entry.meal,
          status: entry.status,
          sourceNote: entry.sourceNote ?? null,
        },
        update: {
          status: entry.status,
          sourceNote: entry.sourceNote ?? null,
        },
      });

      await tx.weeklyMenuDraftDish.deleteMany({
        where: {
          householdId,
          date: entry.date,
          meal: entry.meal,
        },
      });

      if (entry.dishes.length > 0) {
        await tx.weeklyMenuDraftDish.createMany({
          data: entry.dishes.map((dish, idx) => ({
            householdId,
            date: entry.date,
            meal: entry.meal,
            position: idx,
            dishKey: dish.dishKey,
            name: dish.name,
            imageUrl: dish.imageUrl ?? null,
            recipeId: dish.recipeId ?? null,
            bookmarkId: dish.bookmarkId ?? null,
            prepMinutes: dish.prepMinutes ?? null,
            cookMinutes: dish.cookMinutes ?? null,
            baseServings: dish.baseServings ?? null,
            ingredients: dish.ingredients ?? [],
            steps: dish.steps ?? [],
          })),
        });
      }
    }
  });
}

export { prisma };
