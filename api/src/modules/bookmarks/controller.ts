import type { Request, Response } from 'express';
import { getUserId } from '../../middleware/auth.js';
import { previewLink } from './preview.js';
import {
  bookmarkIdParamsSchema,
  importBookmarkSchema,
  importLinkSchema,
  listBookmarksQuerySchema,
  previewLinkSchema,
} from './schema.js';
import * as service from './service.js';

export async function list(req: Request, res: Response) {
  const query = listBookmarksQuerySchema.parse(req.query);
  res.json(await service.listBookmarks(getUserId(req), query));
}

export async function getById(req: Request, res: Response) {
  const { id } = bookmarkIdParamsSchema.parse(req.params);
  res.json(await service.getBookmark(getUserId(req), id));
}

export async function create(req: Request, res: Response) {
  const input = importBookmarkSchema.parse(req.body);
  res.status(201).json(await service.importBookmark(getUserId(req), input));
}

export async function importLink(req: Request, res: Response) {
  const { url, via } = importLinkSchema.parse(req.body);
  const bookmark = await service.importLink(getUserId(req), url, via);
  res.status(bookmark.importStatus === 'processing' ? 202 : 200).json(bookmark);
}

export async function retryImport(req: Request, res: Response) {
  const { id } = bookmarkIdParamsSchema.parse(req.params);
  res.status(202).json(await service.retryImport(getUserId(req), id));
}

export async function remove(req: Request, res: Response) {
  const { id } = bookmarkIdParamsSchema.parse(req.params);
  await service.deleteBookmark(getUserId(req), id);
  res.status(204).end();
}

export async function preview(req: Request, res: Response) {
  const { url, via } = previewLinkSchema.parse(req.body);
  res.json(await previewLink(getUserId(req), url, via));
}
