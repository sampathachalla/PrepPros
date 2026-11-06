import type { Request, Response } from 'express';
import { getUserId } from '../../middleware/auth.js';
import { createRecipeSchema, listRecipesQuerySchema, recipeIdParamsSchema } from './schema.js';
import * as service from './service.js';

export async function list(req: Request, res: Response) {
  const query = listRecipesQuerySchema.parse(req.query);
  res.json(await service.listRecipes(getUserId(req), query));
}

export async function getById(req: Request, res: Response) {
  const { id } = recipeIdParamsSchema.parse(req.params);
  res.json(await service.getRecipe(getUserId(req), id));
}

export async function create(req: Request, res: Response) {
  const input = createRecipeSchema.parse(req.body);
  res.status(201).json(await service.createRecipe(getUserId(req), input));
}

export async function remove(req: Request, res: Response) {
  const { id } = recipeIdParamsSchema.parse(req.params);
  await service.deleteRecipe(getUserId(req), id);
  res.status(204).end();
}

export async function bookmark(req: Request, res: Response) {
  const { id } = recipeIdParamsSchema.parse(req.params);
  res.json(await service.bookmarkRecipe(getUserId(req), id));
}

export async function unbookmark(req: Request, res: Response) {
  const { id } = recipeIdParamsSchema.parse(req.params);
  await service.unbookmarkRecipe(getUserId(req), id);
  res.status(204).end();
}
