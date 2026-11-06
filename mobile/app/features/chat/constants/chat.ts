import type { ChatToolName } from '../types/chat';

export { API_URL } from '@/app/shared/constants/api';

export const CHAT_STORAGE_KEY = 'preppros-chat';

/** Matches the API's limit. */
export const MAX_MESSAGE_LENGTH = 4000;

/** Agent turns can involve several tool calls; the API itself gives up after 120 s. */
export const CHAT_REQUEST_TIMEOUT_MS = 130_000;

export const SUGGESTED_PROMPTS = [
  'Plan 3 high-protein lunches for this week',
  'What can I prep in under 20 minutes?',
  'Show me my saved vegetarian recipes',
  'How do I scale a recipe for 4 people?',
] as const;

/** Shown under a reply so people can see what the assistant looked at. */
export const TOOL_LABELS: Record<ChatToolName, string> = {
  search_recipes: 'Searched your recipes',
  get_recipe: 'Read a recipe',
  bookmark_recipe: 'Saved to bookmarks',
  list_bookmarks: 'Checked your bookmarks',
};
