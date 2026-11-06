import type { Request, Response } from 'express';
import { getUserId } from '../../middleware/auth.js';
import {
  addDishSchema,
  calendarRangeSchema,
  dayParamsSchema,
  decisionSchema,
  dishOptionsQuerySchema,
  dishParamsSchema,
  startTimerSchema,
} from './schema.js';
import * as service from './service.js';

export async function get(req: Request, res: Response) {
  const { from, to } = calendarRangeSchema.parse(req.query);
  res.json(await service.getCalendar(getUserId(req), from, to));
}

export async function dishOptions(req: Request, res: Response) {
  const { meal } = dishOptionsQuerySchema.parse(req.query);
  res.json(await service.getDishOptions(getUserId(req), meal));
}

export async function addDish(req: Request, res: Response) {
  const input = addDishSchema.parse(req.body);
  res.status(201).json(await service.addDish(getUserId(req), input));
}

export async function removeDish(req: Request, res: Response) {
  const { id } = dishParamsSchema.parse(req.params);
  await service.removeDish(getUserId(req), id);
  res.status(204).end();
}

export async function accept(req: Request, res: Response) {
  const { id } = dishParamsSchema.parse(req.params);
  res.json(await service.acceptDish(getUserId(req), id));
}

export async function withdraw(req: Request, res: Response) {
  const { id } = dishParamsSchema.parse(req.params);
  res.json(await service.withdrawAcceptance(getUserId(req), id));
}

export async function decide(req: Request, res: Response) {
  const { id } = dishParamsSchema.parse(req.params);
  const { approve } = decisionSchema.parse(req.body);
  res.json(await service.decideSuggestion(getUserId(req), id, approve));
}

export async function startTimer(req: Request, res: Response) {
  const { dates, durationMinutes } = startTimerSchema.parse(req.body);
  res.json(await service.startTimer(getUserId(req), dates, durationMinutes));
}

export async function fixDay(req: Request, res: Response) {
  const { date } = dayParamsSchema.parse(req.params);
  await service.fixDayNow(getUserId(req), date);
  res.status(204).end();
}
