import { z } from 'zod';
import { preppros } from '../apiClient.ts';
import { summariseBookmark } from './recipes.tool.ts';
import { accessTicket } from './ticket.ts';
import { defineTool } from './types.ts';

const BOOKMARK_CATEGORIES = [
  'all',
  'breakfast',
  'lunch_dinner',
  'snacks',
  'high_protein',
  'quick_prep',
  'vegetarian',
  'dessert',
] as const;

export const listBookmarksTool = defineTool({
  name: 'list_bookmarks',
  description: "List the recipes the user saved (Instagram, YouTube, or from the app), newest first.",
  inputSchema: {
    access_ticket: accessTicket,
    category: z.enum(BOOKMARK_CATEGORIES).default('all'),
  },
  async run({ access_ticket: ticket, category }) {
    const bookmarks = await preppros.listBookmarks(ticket, category);
    return { count: bookmarks.length, bookmarks: bookmarks.map(summariseBookmark) };
  },
});
