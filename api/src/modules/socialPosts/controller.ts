import type { Request, Response } from 'express';
import { listSocialPostsQuerySchema, socialPostIdParamsSchema } from './schema.js';
import * as service from './service.js';

export async function list(req: Request, res: Response) {
  const query = listSocialPostsQuerySchema.parse(req.query);
  res.json(await service.listSocialPosts(query));
}

export async function getById(req: Request, res: Response) {
  const { id } = socialPostIdParamsSchema.parse(req.params);
  res.json(await service.getSocialPost(id));
}
