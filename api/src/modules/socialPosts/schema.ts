import { z } from 'zod';

export const listSocialPostsQuerySchema = z.object({
  platform: z.enum(['instagram', 'youtube']).optional(),
  /** Without the '#'; matched case-insensitively. */
  hashtag: z
    .string()
    .trim()
    .max(100)
    .transform((tag) => tag.replace(/^#/, '').toLowerCase())
    .optional(),
  author: z.string().trim().max(100).optional(),
  /** Searches title, caption and transcript. */
  search: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => value || undefined),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const socialPostIdParamsSchema = z.object({
  id: z.uuid('Invalid post id'),
});

export type ListSocialPostsQuery = z.infer<typeof listSocialPostsQuerySchema>;
