import type { Request, Response } from 'express';
import { getUserId } from '../../middleware/auth.js';
import { updatePreferencesSchema, updateProfileSchema } from './schema.js';
import * as service from './service.js';

export async function get(req: Request, res: Response) {
  res.json(await service.getProfile(getUserId(req)));
}

export async function update(req: Request, res: Response) {
  const input = updateProfileSchema.parse(req.body);
  res.json(await service.updateProfile(getUserId(req), input));
}

export async function updatePreferences(req: Request, res: Response) {
  const input = updatePreferencesSchema.parse(req.body);
  res.json(await service.updatePreferences(getUserId(req), input));
}
