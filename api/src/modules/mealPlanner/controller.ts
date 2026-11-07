import type { Request, Response } from 'express';
import { getUserId } from '../../middleware/auth.js';
import {
  bulkAssignSchema,
  dishCatalogQuerySchema,
  publishWeekSchema,
  saveDishSelectionsSchema,
  setSlotChoiceSchema,
  slotParamsSchema,
  updateSlotDraftSchema,
  updateSlotPoliciesSchema,
  weekParamsSchema,
} from './schema.js';
import * as service from './service.js';

export async function getDishes(req: Request, res: Response) {
  const query = dishCatalogQuerySchema.parse(req.query);
  res.json(await service.getCatalogDishes(getUserId(req), query));
}

export async function getWeek(req: Request, res: Response) {
  const { weekStart } = weekParamsSchema.parse(req.params);
  res.json(await service.getWeekPlan(getUserId(req), weekStart));
}

export async function saveDishSelections(req: Request, res: Response) {
  const { weekStart } = weekParamsSchema.parse(req.params);
  const input = saveDishSelectionsSchema.parse(req.body);
  res.json(await service.saveDishSelections(getUserId(req), weekStart, input));
}

export async function setSlotChoice(req: Request, res: Response) {
  const { date, meal } = slotParamsSchema.parse(req.params);
  const input = setSlotChoiceSchema.parse(req.body);
  res.json(await service.setSlotChoice(getUserId(req), date, meal, input));
}

export async function submitWeek(req: Request, res: Response) {
  const { weekStart } = weekParamsSchema.parse(req.params);
  res.json(await service.submitWeeklyPlan(getUserId(req), weekStart));
}

export async function updateSlotPolicies(req: Request, res: Response) {
  const { weekStart } = weekParamsSchema.parse(req.params);
  const input = updateSlotPoliciesSchema.parse(req.body);
  res.json(await service.updateSlotPolicies(getUserId(req), weekStart, input));
}

export async function bulkAssign(req: Request, res: Response) {
  const { weekStart } = weekParamsSchema.parse(req.params);
  const input = bulkAssignSchema.parse(req.body);
  res.json(await service.bulkAssignDraft(getUserId(req), weekStart, input));
}

export async function updateSlotDraft(req: Request, res: Response) {
  const { date, meal } = slotParamsSchema.parse(req.params);
  const input = updateSlotDraftSchema.parse(req.body);
  res.json(await service.updateSlotDraft(getUserId(req), date, meal, input));
}

export async function publishWeek(req: Request, res: Response) {
  const { weekStart } = weekParamsSchema.parse(req.params);
  const input = publishWeekSchema.parse(req.body ?? {});
  res.json(await service.publishWeeklyMenu(getUserId(req), weekStart, input));
}
