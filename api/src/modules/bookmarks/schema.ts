import { z } from 'zod';

export const BOOKMARK_CATEGORIES = [
  'breakfast',
  'lunch_dinner',
  'snacks',
  'high_protein',
  'quick_prep',
  'vegetarian',
  'dessert',
] as const;

const minutes = z.number().int().min(0, 'Time cannot be negative').max(1440);

/** Optional free-text field: blank strings count as not provided. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

const linkUrl = z
  .string()
  .trim()
  .min(1, 'Please paste a recipe link from Instagram or YouTube')
  .pipe(z.url({ protocol: /^https?$/, error: 'Please enter a valid web URL starting with http:// or https://' }));

/** How the user gave the app the link: the share sheet, or pasting it in. */
const via = z.enum(['share', 'paste']).default('paste');

export const listBookmarksQuerySchema = z.object({
  source: z.enum(['all', 'instagram', 'youtube', 'app']).default('all'),
  category: z.enum(['all', ...BOOKMARK_CATEGORIES]).default('all'),
  search: optionalText(100),
  sort: z.enum(['recent', 'title_asc', 'time']).default('recent'),
});

export const importBookmarkSchema = z.object({
  url: linkUrl,
  via,
  /** Optional: derived from the URL, and must match it when sent. */
  source: z.enum(['instagram', 'youtube']).optional(),
  title: z.string().trim().min(1, 'Please provide a recipe title').max(150),
  category: z.enum(BOOKMARK_CATEGORIES),
  author: optionalText(100),
  thumbnailUrl: optionalText(2048).pipe(z.url({ protocol: /^https?$/ }).optional()),
  prepTimeMinutes: minutes.optional(),
  cookTimeMinutes: minutes.optional(),
  servings: z.number().int().min(1).max(50).optional(),
  ingredientsText: optionalText(5000),
  notes: optionalText(2000),
});

export const previewLinkSchema = z.object({ url: linkUrl, via });
export const importLinkSchema = previewLinkSchema;

export const bookmarkIdParamsSchema = z.object({
  id: z.uuid('Invalid bookmark id'),
});

export type ListBookmarksQuery = z.infer<typeof listBookmarksQuerySchema>;
export type ImportBookmarkInput = z.infer<typeof importBookmarkSchema>;
