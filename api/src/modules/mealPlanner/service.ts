import type { DraftSlotStatus, HouseholdMember, MealType } from '../../generated/prisma/client.js';
import { AppError, notFound } from '../../utils/AppError.js';
import { addDays, fromDbDate, toDbDate } from '../../utils/dates.js';
import { findHouseholdById } from '../household/repository.js';
import { requireAdmin, requireMembership } from '../household/service.js';
import * as repository from './repository.js';
import {
  MEAL_TYPES,
  type BulkAssignInput,
  type DishCatalogQuery,
  type DishItemInput,
  type PublishWeekInput,
  type SaveDishSelectionsInput,
  type SetSlotChoiceInput,
  type UpdateSlotDraftInput,
  type UpdateSlotPoliciesInput,
} from './schema.js';

function getSundayStartDate(date: Date): Date {
  const dayOfWeek = date.getUTCDay();
  return addDays(date, -dayOfWeek);
}

function buildWeekDateObjects(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

function slotMapKey(date: Date, meal: MealType): string {
  return `${fromDbDate(date)}:${meal}`;
}

async function ensureNotPastDeadlineForMember(
  membership: HouseholdMember,
  householdId: string,
  weekStart: Date,
) {
  if (membership.role === 'admin') return;
  const plan = await repository.findWeeklyPlan(householdId, weekStart);
  if (plan?.submissionDeadline && plan.submissionDeadline.getTime() <= Date.now()) {
    await repository.lockExpiredSubmissions(householdId, weekStart);
    throw new AppError(409, 'The planning deadline for this week has passed');
  }
  const submission = await repository.findMemberSubmission(householdId, weekStart, membership.userId);
  if (submission?.status === 'locked') {
    throw new AppError(409, 'Your weekly submission is locked for admin review');
  }
}

async function ensureSlotEditableForMember(
  membership: HouseholdMember,
  householdId: string,
  date: Date,
  meal: MealType,
) {
  if (membership.role === 'admin') return;
  const policy = await repository.findSlotPolicy(householdId, date, meal);
  if (policy?.status === 'reserved') {
    throw new AppError(409, 'This meal slot is reserved by the admin');
  }
}

export async function getCatalogDishes(userId: string, query: DishCatalogQuery) {
  const membership = await requireMembership(userId);
  const { householdId } = membership;
  const household = await findHouseholdById(householdId);
  const memberIds = household?.members.map((m) => m.userId) ?? [userId];

  const weekStart = getSundayStartDate(toDbDate(query.weekStart));
  const weekEnd = addDays(weekStart, 6);

  const [bookmarks, recipes, likedRows, suggestedRows, historyDishes, weekProposals] = await Promise.all([
    repository.findHouseholdBookmarks(memberIds),
    repository.findCatalogAndHouseholdRecipes(memberIds),
    repository.findLikedMeals(memberIds),
    repository.findSuggestedMeals(memberIds),
    repository.findHouseholdHistoricalDishes(householdId),
    repository.findWeekProposals(householdId, weekStart, weekEnd),
  ]);

  const interestByDishKey = new Map<string, Set<string>>();
  const interestByName = new Map<string, Set<string>>();
  const addInterest = (dishKey: string, name: string, memberId: string) => {
    const kSet = interestByDishKey.get(dishKey) ?? new Set<string>();
    kSet.add(memberId);
    interestByDishKey.set(dishKey, kSet);

    const lower = name.trim().toLowerCase();
    const nSet = interestByName.get(lower) ?? new Set<string>();
    nSet.add(memberId);
    interestByName.set(lower, nSet);
  };

  for (const like of likedRows) {
    addInterest(`recipe:${like.recipeId}`, '', like.userId);
  }
  for (const bm of bookmarks) {
    const key = bm.recipeId ? `recipe:${bm.recipeId}` : `bookmark:${bm.id}`;
    addInterest(key, bm.title, bm.userId);
  }
  for (const prop of weekProposals) {
    const participants = new Set<string>([prop.proposerId, ...prop.choices.map((c) => c.userId)]);
    for (const dish of prop.dishes) {
      for (const pid of participants) {
        addInterest(dish.dishKey, dish.name, pid);
      }
    }
  }

  const likedRecipeIds = new Set<string>([
    ...likedRows.map((l) => l.recipeId),
    ...bookmarks.filter((b) => b.source === 'app' && b.recipeId).map((b) => b.recipeId!),
  ]);
  const suggestedByRecipeId = new Map(suggestedRows.map((s) => [s.recipeId, s]));

  interface UnifiedDish {
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
    ingredients: string[];
    steps: string[];
  }

  const catalogMap = new Map<string, UnifiedDish>();

  const collectInterestedIds = (dishKey: string, name: string): string[] => {
    const merged = new Set<string>([
      ...(interestByDishKey.get(dishKey) ?? []),
      ...(interestByName.get(name.trim().toLowerCase()) ?? []),
    ]);
    return [...merged];
  };

  for (const bm of bookmarks) {
    const dishKey = bm.recipeId ? `recipe:${bm.recipeId}` : `bookmark:${bm.id}`;
    const nameKey = bm.title.trim().toLowerCase();
    if (catalogMap.has(nameKey)) continue;
    const minutes = (bm.prepTimeMinutes ?? 0) + (bm.cookTimeMinutes ?? 0) || undefined;
    catalogMap.set(nameKey, {
      dishKey,
      name: bm.title,
      imageUrl: bm.thumbnailUrl || undefined,
      minutes,
      recipeId: bm.recipeId ?? null,
      bookmarkId: bm.id,
      fromDishId: null,
      isLiked: bm.source === 'app' || (bm.recipeId ? likedRecipeIds.has(bm.recipeId) : false),
      isRecentlyAdded: true,
      isSuggested: bm.recipeId ? suggestedByRecipeId.has(bm.recipeId) : false,
      reason: bm.source !== 'app' ? `Imported from ${bm.source}` : 'Saved in Bookmarks',
      interestedMemberIds: collectInterestedIds(dishKey, bm.title),
      ingredients: bm.ingredients,
      steps: [],
    });
  }

  for (const hist of historyDishes) {
    const nameKey = hist.name.trim().toLowerCase();
    const dishKey = hist.recipeId ? `recipe:${hist.recipeId}` : `dish:${hist.id}`;
    const existing = catalogMap.get(nameKey);
    if (existing) {
      existing.isSuggested = true;
      if (!existing.reason) existing.reason = 'Your household had this';
      continue;
    }
    const minutes = (hist.prepMinutes ?? 0) + (hist.cookMinutes ?? 0) || undefined;
    catalogMap.set(nameKey, {
      dishKey,
      name: hist.name,
      imageUrl: hist.imageUrl ?? undefined,
      minutes,
      recipeId: hist.recipeId ?? null,
      bookmarkId: hist.bookmarkId ?? null,
      fromDishId: hist.id,
      isLiked: hist.recipeId ? likedRecipeIds.has(hist.recipeId) : false,
      isRecentlyAdded: false,
      isSuggested: true,
      reason: 'Your household had this',
      interestedMemberIds: collectInterestedIds(dishKey, hist.name),
      ingredients: hist.ingredients,
      steps: hist.steps,
    });
  }

  for (const recipe of recipes) {
    const nameKey = recipe.title.trim().toLowerCase();
    const dishKey = `recipe:${recipe.id}`;
    const isLiked = likedRecipeIds.has(recipe.id);
    const suggestion = suggestedByRecipeId.get(recipe.id);
    const isCustom = recipe.ownerId !== null;
    const existing = catalogMap.get(nameKey);
    if (existing) {
      existing.isLiked = existing.isLiked || isLiked;
      existing.isSuggested = existing.isSuggested || Boolean(suggestion) || !isCustom;
      continue;
    }
    catalogMap.set(nameKey, {
      dishKey,
      name: recipe.title,
      imageUrl: recipe.imageUrl || undefined,
      minutes: recipe.prepTimeMinutes + (recipe.cookTimeMinutes ?? 0) || undefined,
      recipeId: recipe.id,
      bookmarkId: null,
      fromDishId: null,
      isLiked,
      isRecentlyAdded: isCustom,
      isSuggested: Boolean(suggestion) || !isCustom,
      reason: suggestion?.reason ?? (isCustom ? 'Added by household' : 'From PrepPros'),
      interestedMemberIds: collectInterestedIds(dishKey, recipe.title),
      ingredients: recipe.ingredients.map(({ amount, name }) => (amount ? `${amount} ${name}` : name)),
      steps: recipe.steps.map((s) => s.instruction),
    });
  }

  let dishes = [...catalogMap.values()];

  if (query.filter) {
    const filtered = dishes.filter((d) =>
      query.filter === 'liked'
        ? d.isLiked
        : query.filter === 'recently_added'
          ? d.isRecentlyAdded
          : d.isSuggested,
    );
    // Ensure a newly seeded household still sees dishes under Liked / Recently Added if none are explicitly tagged yet
    if (filtered.length > 0 || query.q) {
      dishes = filtered;
    }
  }

  if (query.q) {
    const q = query.q.toLowerCase();
    dishes = dishes.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.reason?.toLowerCase().includes(q) ?? false) ||
        d.ingredients.some((ing) => ing.toLowerCase().includes(q)),
    );
  }

  return {
    weekStart: fromDbDate(weekStart),
    dishes,
  };
}

export async function getWeekPlan(userId: string, weekStartStr: string) {
  const membership = await requireMembership(userId);
  const { householdId } = membership;
  const weekStart = getSundayStartDate(toDbDate(weekStartStr));
  const weekEnd = addDays(weekStart, 6);

  const [weeklyPlan, policies, proposals, choices, submissions, draftSlots] = await Promise.all([
    repository.findWeeklyPlan(householdId, weekStart),
    repository.findWeekSlotPolicies(householdId, weekStart, weekEnd),
    repository.findWeekProposals(householdId, weekStart, weekEnd),
    repository.findWeekChoices(householdId, weekStart, weekEnd),
    repository.findWeekSubmissions(householdId, weekStart),
    repository.findWeekDraftSlots(householdId, weekStart, weekEnd),
  ]);

  const now = new Date();
  const isDeadlinePassed = Boolean(
    weeklyPlan?.submissionDeadline && weeklyPlan.submissionDeadline.getTime() <= now.getTime(),
  );

  if (isDeadlinePassed) {
    await repository.lockExpiredSubmissions(householdId, weekStart);
  }

  const policyMap = new Map(policies.map((p) => [slotMapKey(p.date, p.meal), p.status]));
  const proposalsBySlot = new Map<string, typeof proposals>();
  for (const prop of proposals) {
    if (prop.dishes.length === 0) continue;
    const key = slotMapKey(prop.date, prop.meal);
    const list = proposalsBySlot.get(key) ?? [];
    list.push(prop);
    proposalsBySlot.set(key, list);
  }

  const myChoiceBySlot = new Map<string, string>();
  for (const choice of choices) {
    if (choice.userId === userId) {
      myChoiceBySlot.set(slotMapKey(choice.date, choice.meal), choice.proposalId);
    }
  }

  const draftBySlot = new Map(draftSlots.map((d) => [slotMapKey(d.date, d.meal), d]));

  const slots = [];
  for (const date of buildWeekDateObjects(weekStart)) {
    const dateStr = fromDbDate(date);
    for (const meal of MEAL_TYPES) {
      const key = `${dateStr}:${meal}`;
      const slotProposals = proposalsBySlot.get(key) ?? [];
      const draft = draftBySlot.get(key);
      const ownProposal = slotProposals.find((p) => p.proposerId === userId);
      const myChoiceProposalId = myChoiceBySlot.get(key) ?? ownProposal?.id ?? null;

      slots.push({
        date: dateStr,
        meal,
        policy: policyMap.get(key) ?? 'available',
        myChoiceProposalId,
        proposals: slotProposals.map((p) => {
          const participantSet = new Set<string>([
            p.proposerId,
            ...p.choices.map((c) => c.userId),
          ]);
          // If the proposer explicitly joined someone else's proposal for this slot, remove them from their old proposal's active participants
          const proposerChoice = choices.find(
            (c) =>
              fromDbDate(c.date) === dateStr &&
              c.meal === meal &&
              c.userId === p.proposerId,
          );
          if (proposerChoice && proposerChoice.proposalId !== p.id) {
            participantSet.delete(p.proposerId);
          }
          return {
            id: p.id,
            proposerId: p.proposerId,
            dishes: p.dishes.map((d) => ({
              id: d.id,
              dishKey: d.dishKey,
              name: d.name,
              imageUrl: d.imageUrl ?? undefined,
              recipeId: d.recipeId,
              bookmarkId: d.bookmarkId,
              prepMinutes: d.prepMinutes ?? undefined,
              cookMinutes: d.cookMinutes ?? undefined,
              baseServings: d.baseServings ?? undefined,
              ingredients: d.ingredients,
              steps: d.steps,
            })),
            participantMemberIds: [...participantSet],
          };
        }),
        adminDraft: {
          status: draft?.status ?? 'empty',
          sourceNote: draft?.sourceNote ?? null,
          dishes:
            draft?.dishes.map((d) => ({
              id: d.id,
              dishKey: d.dishKey,
              name: d.name,
              imageUrl: d.imageUrl ?? undefined,
              recipeId: d.recipeId,
              bookmarkId: d.bookmarkId,
              prepMinutes: d.prepMinutes ?? undefined,
              cookMinutes: d.cookMinutes ?? undefined,
              baseServings: d.baseServings ?? undefined,
              ingredients: d.ingredients,
              steps: d.steps,
            })) ?? [],
        },
      });
    }
  }

  const mySubRow = submissions.find((s) => s.userId === userId);
  const effectiveMyStatus = isDeadlinePassed ? 'locked' : (mySubRow?.status ?? 'draft');

  return {
    serverTime: now.toISOString(),
    week: {
      weekStart: fromDbDate(weekStart),
      submissionDeadline: weeklyPlan?.submissionDeadline?.toISOString() ?? null,
      isDeadlinePassed,
      publishedVersion: weeklyPlan?.publishedVersion ?? 0,
      publishedAt: weeklyPlan?.publishedAt?.toISOString() ?? null,
      hasUnpublishedChanges: weeklyPlan?.hasUnpublishedChanges ?? false,
    },
    mySubmission: {
      status: effectiveMyStatus,
      submittedAt: mySubRow?.submittedAt?.toISOString() ?? null,
    },
    memberSubmissions: submissions.map((s) => ({
      userId: s.userId,
      status: isDeadlinePassed ? 'locked' : s.status,
      submittedAt: s.submittedAt?.toISOString() ?? null,
    })),
    slots,
  };
}

export async function saveDishSelections(
  userId: string,
  weekStartStr: string,
  input: SaveDishSelectionsInput,
) {
  const membership = await requireMembership(userId);
  const { householdId } = membership;
  const weekStart = getSundayStartDate(toDbDate(weekStartStr));

  await ensureNotPastDeadlineForMember(membership, householdId, weekStart);

  for (const slot of [...input.addSlots, ...input.removeSlots]) {
    await ensureSlotEditableForMember(membership, householdId, toDbDate(slot.date), slot.meal);
  }

  await repository.prisma.$transaction(async (tx) => {
    for (const slot of input.addSlots) {
      const date = toDbDate(slot.date);
      const proposal = await tx.mealProposal.upsert({
        where: {
          householdId_date_meal_proposerId: {
            householdId,
            date,
            meal: slot.meal,
            proposerId: userId,
          },
        },
        create: {
          householdId,
          date,
          meal: slot.meal,
          proposerId: userId,
        },
        update: {},
        include: { dishes: { orderBy: { position: 'asc' } } },
      });

      const alreadyHas = proposal.dishes.some(
        (d) =>
          d.dishKey === input.dish.dishKey ||
          d.name.toLowerCase() === input.dish.name.toLowerCase(),
      );

      if (!alreadyHas) {
        await tx.mealProposalDish.create({
          data: {
            proposalId: proposal.id,
            position: proposal.dishes.length,
            dishKey: input.dish.dishKey,
            name: input.dish.name,
            imageUrl: input.dish.imageUrl ?? null,
            recipeId: input.dish.recipeId ?? null,
            bookmarkId: input.dish.bookmarkId ?? null,
            prepMinutes: input.dish.prepMinutes ?? null,
            cookMinutes: input.dish.cookMinutes ?? null,
            baseServings: input.dish.baseServings ?? null,
            ingredients: input.dish.ingredients ?? [],
            steps: input.dish.steps ?? [],
          },
        });
      }

      await tx.memberSlotChoice.upsert({
        where: {
          householdId_date_meal_userId: {
            householdId,
            date,
            meal: slot.meal,
            userId,
          },
        },
        create: {
          householdId,
          date,
          meal: slot.meal,
          userId,
          proposalId: proposal.id,
        },
        update: {
          proposalId: proposal.id,
        },
      });
    }

    for (const slot of input.removeSlots) {
      const date = toDbDate(slot.date);
      const proposal = await tx.mealProposal.findUnique({
        where: {
          householdId_date_meal_proposerId: {
            householdId,
            date,
            meal: slot.meal,
            proposerId: userId,
          },
        },
      });
      if (!proposal) continue;

      await tx.mealProposalDish.deleteMany({
        where: {
          proposalId: proposal.id,
          OR: [
            { dishKey: input.dish.dishKey },
            { name: { equals: input.dish.name, mode: 'insensitive' } },
          ],
        },
      });
    }
  });

  return getWeekPlan(userId, fromDbDate(weekStart));
}

export async function setSlotChoice(
  userId: string,
  dateStr: string,
  meal: MealType,
  input: SetSlotChoiceInput,
) {
  const membership = await requireMembership(userId);
  const { householdId } = membership;
  const date = toDbDate(dateStr);
  const weekStart = getSundayStartDate(date);

  await ensureNotPastDeadlineForMember(membership, householdId, weekStart);
  await ensureSlotEditableForMember(membership, householdId, date, meal);

  if (input.mode === 'join_proposal') {
    const target = await repository.findProposalById(householdId, input.proposalId);
    if (!target || fromDbDate(target.date) !== dateStr || target.meal !== meal) {
      throw notFound('Meal proposal');
    }

    await repository.prisma.memberSlotChoice.upsert({
      where: {
        householdId_date_meal_userId: {
          householdId,
          date,
          meal,
          userId,
        },
      },
      create: {
        householdId,
        date,
        meal,
        userId,
        proposalId: target.id,
      },
      update: {
        proposalId: target.id,
      },
    });
  } else {
    await repository.prisma.$transaction(async (tx) => {
      const ownProposal = await tx.mealProposal.upsert({
        where: {
          householdId_date_meal_proposerId: {
            householdId,
            date,
            meal,
            proposerId: userId,
          },
        },
        create: {
          householdId,
          date,
          meal,
          proposerId: userId,
        },
        update: {},
      });

      if (input.dishes) {
        await tx.mealProposalDish.deleteMany({ where: { proposalId: ownProposal.id } });
        if (input.dishes.length > 0) {
          await tx.mealProposalDish.createMany({
            data: input.dishes.map((dish, idx) => ({
              proposalId: ownProposal.id,
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

      await tx.memberSlotChoice.upsert({
        where: {
          householdId_date_meal_userId: {
            householdId,
            date,
            meal,
            userId,
          },
        },
        create: {
          householdId,
          date,
          meal,
          userId,
          proposalId: ownProposal.id,
        },
        update: {
          proposalId: ownProposal.id,
        },
      });
    });
  }

  return getWeekPlan(userId, fromDbDate(weekStart));
}

export async function submitWeeklyPlan(userId: string, weekStartStr: string) {
  const membership = await requireMembership(userId);
  const { householdId } = membership;
  const weekStart = getSundayStartDate(toDbDate(weekStartStr));

  await ensureNotPastDeadlineForMember(membership, householdId, weekStart);

  const now = new Date();
  const submission = await repository.upsertMemberSubmission(
    householdId,
    weekStart,
    userId,
    'submitted',
    now,
  );

  return {
    weekStart: fromDbDate(weekStart),
    status: submission.status,
    submittedAt: submission.submittedAt?.toISOString() ?? now.toISOString(),
  };
}

export async function updateSlotPolicies(
  userId: string,
  weekStartStr: string,
  input: UpdateSlotPoliciesInput,
) {
  const membership = await requireMembership(userId);
  requireAdmin(membership);
  const { householdId } = membership;
  const weekStart = getSundayStartDate(toDbDate(weekStartStr));

  const parsedDeadline =
    typeof input.submissionDeadline === 'undefined'
      ? undefined
      : input.submissionDeadline === null
        ? null
        : new Date(input.submissionDeadline);

  await repository.saveSlotPoliciesTransaction(
    householdId,
    weekStart,
    userId,
    parsedDeadline,
    input.slots.map((s) => ({
      date: toDbDate(s.date),
      meal: s.meal,
      status: s.status,
    })),
  );

  return getWeekPlan(userId, fromDbDate(weekStart));
}

export async function bulkAssignDraft(
  userId: string,
  weekStartStr: string,
  input: BulkAssignInput,
) {
  const membership = await requireMembership(userId);
  requireAdmin(membership);
  const { householdId } = membership;
  const weekStart = getSundayStartDate(toDbDate(weekStartStr));
  const weekEnd = addDays(weekStart, 6);

  const [household, proposals, choices] = await Promise.all([
    findHouseholdById(householdId),
    repository.findWeekProposals(householdId, weekStart, weekEnd),
    repository.findWeekChoices(householdId, weekStart, weekEnd),
  ]);

  const memberNameMap = new Map(
    (household?.members ?? []).map((m) => [
      m.userId,
      m.user.displayName ?? m.user.username ?? m.user.email.split('@')[0],
    ]),
  );

  const proposalsBySlot = new Map<string, typeof proposals>();
  for (const prop of proposals) {
    if (prop.dishes.length === 0) continue;
    const key = slotMapKey(prop.date, prop.meal);
    const list = proposalsBySlot.get(key) ?? [];
    list.push(prop);
    proposalsBySlot.set(key, list);
  }

  let populatedCount = 0;
  let emptyCount = 0;
  let needsReviewCount = 0;

  const entriesToWrite: {
    date: Date;
    meal: MealType;
    status: DraftSlotStatus;
    sourceNote?: string | null;
    dishes: DishItemInput[];
  }[] = [];

  for (const coord of input.slots) {
    const date = toDbDate(coord.date);
    const key = `${coord.date}:${coord.meal}`;
    const slotProposals = proposalsBySlot.get(key) ?? [];

    if (input.strategy === 'member_complete') {
      const targetMemberId = input.sourceMemberIds[0] ?? userId;
      const memberChoice = choices.find(
        (c) =>
          fromDbDate(c.date) === coord.date &&
          c.meal === coord.meal &&
          c.userId === targetMemberId,
      );
      const chosenProposal = memberChoice
        ? slotProposals.find((p) => p.id === memberChoice.proposalId)
        : slotProposals.find((p) => p.proposerId === targetMemberId);

      if (chosenProposal && chosenProposal.dishes.length > 0) {
        populatedCount += 1;
        const memberName = memberNameMap.get(targetMemberId) ?? 'Member';
        entriesToWrite.push({
          date,
          meal: coord.meal,
          status: 'ready',
          sourceNote: `${memberName}'s meal`,
          dishes: chosenProposal.dishes.map((d) => ({
            dishKey: d.dishKey,
            name: d.name,
            imageUrl: d.imageUrl ?? undefined,
            recipeId: d.recipeId,
            bookmarkId: d.bookmarkId,
            prepMinutes: d.prepMinutes ?? undefined,
            cookMinutes: d.cookMinutes ?? undefined,
            baseServings: d.baseServings ?? undefined,
            ingredients: d.ingredients,
            steps: d.steps,
          })),
        });
      } else {
        emptyCount += 1;
        entriesToWrite.push({
          date,
          meal: coord.meal,
          status: 'empty',
          sourceNote: null,
          dishes: [],
        });
      }
    } else if (input.strategy === 'union') {
      const relevant = slotProposals.filter(
        (p) =>
          input.sourceMemberIds.length === 0 ||
          input.sourceMemberIds.includes(p.proposerId) ||
          p.choices.some((c) => input.sourceMemberIds.includes(c.userId)),
      );
      const seen = new Set<string>();
      const combined: DishItemInput[] = [];
      for (const prop of relevant) {
        for (const d of prop.dishes) {
          const dk = d.dishKey || d.name.toLowerCase();
          if (!seen.has(dk)) {
            seen.add(dk);
            combined.push({
              dishKey: d.dishKey,
              name: d.name,
              imageUrl: d.imageUrl ?? undefined,
              recipeId: d.recipeId,
              bookmarkId: d.bookmarkId,
              prepMinutes: d.prepMinutes ?? undefined,
              cookMinutes: d.cookMinutes ?? undefined,
              baseServings: d.baseServings ?? undefined,
              ingredients: d.ingredients,
              steps: d.steps,
            });
          }
        }
      }
      if (combined.length > 0) {
        populatedCount += 1;
        needsReviewCount += 1;
        entriesToWrite.push({
          date,
          meal: coord.meal,
          status: 'needs_review',
          sourceNote: 'Combined dishes (review required)',
          dishes: combined,
        });
      } else {
        emptyCount += 1;
        entriesToWrite.push({
          date,
          meal: coord.meal,
          status: 'empty',
          sourceNote: null,
          dishes: [],
        });
      }
    } else {
      // intersection
      const bundles = slotProposals
        .filter(
          (p) =>
            p.dishes.length > 0 &&
            (input.sourceMemberIds.length === 0 ||
              input.sourceMemberIds.includes(p.proposerId) ||
              p.choices.some((c) => input.sourceMemberIds.includes(c.userId))),
        )
        .map((p) => p.dishes);

      if (bundles.length === 0) {
        emptyCount += 1;
        entriesToWrite.push({
          date,
          meal: coord.meal,
          status: 'empty',
          sourceNote: 'Common dishes',
          dishes: [],
        });
      } else {
        const [first, ...rest] = bundles;
        const common = first.filter((d) =>
          rest.every((b) =>
            b.some(
              (other) =>
                other.dishKey === d.dishKey ||
                other.name.toLowerCase() === d.name.toLowerCase(),
            ),
          ),
        );
        if (common.length > 0) {
          populatedCount += 1;
          needsReviewCount += 1;
          entriesToWrite.push({
            date,
            meal: coord.meal,
            status: 'needs_review',
            sourceNote: 'Common dishes',
            dishes: common.map((d) => ({
              dishKey: d.dishKey,
              name: d.name,
              imageUrl: d.imageUrl ?? undefined,
              recipeId: d.recipeId,
              bookmarkId: d.bookmarkId,
              prepMinutes: d.prepMinutes ?? undefined,
              cookMinutes: d.cookMinutes ?? undefined,
              baseServings: d.baseServings ?? undefined,
              ingredients: d.ingredients,
              steps: d.steps,
            })),
          });
        } else {
          emptyCount += 1;
          entriesToWrite.push({
            date,
            meal: coord.meal,
            status: 'empty',
            sourceNote: 'No common dishes',
            dishes: [],
          });
        }
      }
    }
  }

  if (!input.dryRun) {
    // Only overwrite slots that actually received dishes (per spec: "Only copy a member proposal into a slot where that member submitted one. Empty results remain unfilled and are visibly flagged.")
    const nonDestructiveEntries =
      input.strategy === 'member_complete'
        ? entriesToWrite.filter((e) => e.dishes.length > 0)
        : entriesToWrite;

    if (nonDestructiveEntries.length > 0) {
      await repository.writeDraftSlotDishesTransaction(
        householdId,
        weekStart,
        nonDestructiveEntries,
      );
    }
  }

  return {
    selectedCount: input.slots.length,
    populatedCount,
    emptyCount,
    needsReviewCount,
    affectedSlots: entriesToWrite.map((e) => ({
      date: fromDbDate(e.date),
      meal: e.meal,
      status: e.status,
      sourceNote: e.sourceNote ?? null,
      dishes: e.dishes,
    })),
  };
}

export async function updateSlotDraft(
  userId: string,
  dateStr: string,
  meal: MealType,
  input: UpdateSlotDraftInput,
) {
  const membership = await requireMembership(userId);
  requireAdmin(membership);
  const { householdId } = membership;
  const date = toDbDate(dateStr);
  const weekStart = getSundayStartDate(date);

  const status: DraftSlotStatus = input.dishes.length > 0 ? 'ready' : 'empty';
  await repository.writeDraftSlotDishesTransaction(householdId, weekStart, [
    {
      date,
      meal,
      status,
      sourceNote: input.sourceNote ?? (input.dishes.length > 0 ? 'Admin edited' : null),
      dishes: input.dishes,
    },
  ]);

  return getWeekPlan(userId, fromDbDate(weekStart));
}

export async function publishWeeklyMenu(
  userId: string,
  weekStartStr: string,
  input: PublishWeekInput,
) {
  const membership = await requireMembership(userId);
  requireAdmin(membership);
  const { householdId } = membership;
  const weekStart = getSundayStartDate(toDbDate(weekStartStr));
  const weekEnd = addDays(weekStart, 6);

  const [household, policies, draftSlots, choices] = await Promise.all([
    findHouseholdById(householdId),
    repository.findWeekSlotPolicies(householdId, weekStart, weekEnd),
    repository.findWeekDraftSlots(householdId, weekStart, weekEnd),
    repository.findWeekChoices(householdId, weekStart, weekEnd),
  ]);

  const memberIds = household?.members.map((m) => m.userId) ?? [userId];
  const policyMap = new Map(policies.map((p) => [slotMapKey(p.date, p.meal), p.status]));
  const draftMap = new Map(draftSlots.map((d) => [slotMapKey(d.date, d.meal), d]));

  let emptySlotsCount = 0;
  let needsReviewSlotsCount = 0;
  let emptyReservedSlotsCount = 0;

  for (const date of buildWeekDateObjects(weekStart)) {
    for (const meal of MEAL_TYPES) {
      const key = slotMapKey(date, meal);
      const draft = draftMap.get(key);
      const policy = policyMap.get(key) ?? 'available';
      const hasDishes = (draft?.dishes.length ?? 0) > 0;

      if (!hasDishes) {
        emptySlotsCount += 1;
        if (policy === 'reserved') emptyReservedSlotsCount += 1;
      } else if (draft?.status === 'needs_review') {
        needsReviewSlotsCount += 1;
      }
    }
  }

  if (
    !input.allowIncomplete &&
    (emptySlotsCount > 0 || needsReviewSlotsCount > 0 || emptyReservedSlotsCount > 0)
  ) {
    throw new AppError(
      409,
      `This week has ${emptySlotsCount} empty slot(s) and ${needsReviewSlotsCount} slot(s) needing review. Confirm to publish anyway.`,
    );
  }

  const now = new Date();
  const updatedPlan = await repository.prisma.$transaction(async (tx) => {
    const existing = await tx.weeklyPlan.findUnique({
      where: { householdId_weekStart: { householdId, weekStart } },
    });
    const nextVersion = (existing?.publishedVersion ?? 0) + 1;

    const plan = await tx.weeklyPlan.upsert({
      where: { householdId_weekStart: { householdId, weekStart } },
      create: {
        householdId,
        weekStart,
        publishedVersion: nextVersion,
        publishedAt: now,
        hasUnpublishedChanges: false,
      },
      update: {
        publishedVersion: nextVersion,
        publishedAt: now,
        hasUnpublishedChanges: false,
      },
    });

    await tx.weeklyMenuDraftSlot.updateMany({
      where: {
        householdId,
        date: { gte: weekStart, lte: weekEnd },
        status: { in: ['draft', 'needs_review'] },
      },
      data: { status: 'ready' },
    });

    // Replace published snapshot in MealDay and PlannedDish for this week
    await tx.plannedDish.deleteMany({
      where: {
        householdId,
        date: { gte: weekStart, lte: weekEnd },
      },
    });

    for (const date of buildWeekDateObjects(weekStart)) {
      await tx.mealDay.upsert({
        where: { householdId_date: { householdId, date } },
        create: { householdId, date, status: 'fixed', votingEndsAt: null },
        update: { status: 'fixed', votingEndsAt: null },
      });

      for (const meal of MEAL_TYPES) {
        const draft = draftMap.get(slotMapKey(date, meal));
        if (!draft || draft.dishes.length === 0) continue;

        const slotChoices = choices.filter(
          (c) => c.date.getTime() === date.getTime() && c.meal === meal,
        );
        const participatingIds =
          slotChoices.length > 0
            ? [...new Set(slotChoices.map((c) => c.userId))]
            : memberIds;

        for (let i = 0; i < draft.dishes.length; i++) {
          const d = draft.dishes[i];
          const createdDish = await tx.plannedDish.create({
            data: {
              householdId,
              date,
              meal,
              name: d.name,
              imageUrl: d.imageUrl,
              recipeId: d.recipeId,
              bookmarkId: d.bookmarkId,
              prepMinutes: d.prepMinutes,
              cookMinutes: d.cookMinutes,
              baseServings: d.baseServings,
              ingredients: d.ingredients,
              steps: d.steps,
              isSuggestion: false,
              status: 'approved',
              addedById: userId,
            },
          });

          // Attach meal responses to the first dish of the slot (so MealResponse unique constraint per user/date/meal holds and servings are counted)
          if (i === 0 && participatingIds.length > 0) {
            await tx.mealResponse.createMany({
              data: participatingIds.map((uid) => ({
                householdId,
                date,
                meal,
                userId: uid,
                dishId: createdDish.id,
                isDefault: false,
              })),
              skipDuplicates: true,
            });
          }
        }
      }
    }

    return plan;
  });

  return {
    weekStart: fromDbDate(weekStart),
    publishedVersion: updatedPlan.publishedVersion,
    publishedAt: updatedPlan.publishedAt?.toISOString() ?? now.toISOString(),
    emptySlotsCount,
    needsReviewSlotsCount,
    emptyReservedSlotsCount,
  };
}
