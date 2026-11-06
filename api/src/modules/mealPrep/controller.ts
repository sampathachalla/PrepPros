import type { Request, Response } from 'express';
import { getUserId } from '../../middleware/auth.js';
import { mealPrepQuerySchema, prepDishParamsSchema, shoppingCheckSchema, updatePrepDishSchema } from './schema.js';
import * as service from './service.js';

export async function get(req: Request, res: Response) {
  const { weekStart } = mealPrepQuerySchema.parse(req.query);
  res.json(await service.getMealPrep(getUserId(req), weekStart));
}

export async function updateDish(req: Request, res: Response) {
  const { id } = prepDishParamsSchema.parse(req.params);
  await service.updatePrepDish(getUserId(req), id, updatePrepDishSchema.parse(req.body));
  res.status(204).end();
}

export async function setShoppingCheck(req: Request, res: Response) {
  const { weekStart, key, checked } = shoppingCheckSchema.parse(req.body);
  await service.setShoppingCheck(getUserId(req), weekStart, key, checked);
  res.status(204).end();
}
