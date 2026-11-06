import type { Request, Response } from 'express';
import { getUserId } from '../../middleware/auth.js';
import { researchRequestSchema, sendMessageSchema } from './schema.js';
import * as service from './service.js';

export async function research(req: Request, res: Response) {
  const input = researchRequestSchema.parse(req.body);
  res.status(201).json(await service.runResearch(input));
}

export async function sendMessage(req: Request, res: Response) {
  const input = sendMessageSchema.parse(req.body);
  res.json(await service.sendMessage(getUserId(req), input));
}
