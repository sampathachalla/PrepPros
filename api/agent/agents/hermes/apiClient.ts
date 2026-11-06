import { config } from './config.ts';

/** An error whose message is safe to hand back to the model. */
export class ToolError extends Error {}

export type Recipe = {
  id: string;
  title: string;
  category?: string;
  prepTimeMinutes: number;
  cookTimeMinutes?: number;
  servings: number;
  difficulty: string;
  isBookmarked: boolean;
  isCustom: boolean;
  ingredients: { name: string; amount?: string }[];
  steps: { stepNumber: number; instruction: string }[];
};

export type Bookmark = {
  id: string;
  title: string;
  source: string;
  url: string;
  author: string;
  category?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  ingredients: string[];
  notes?: string;
  recipeId?: string;
};

/**
 * Calls the API's agent tool routes. The chat ticket identifies the app user the API issued it to,
 * so every call only sees that user's recipes and bookmarks.
 */
async function request<T>(ticket: string, method: 'GET' | 'PUT', path: string): Promise<T> {
  if (!config.toolsKey) throw new ToolError('PrepPros tools are not configured (AGENT_TOOLS_KEY is missing).');

  const response = await fetch(`${config.apiUrl}/chat/tools${path}`, {
    method,
    headers: { authorization: `Bearer ${config.toolsKey}`, 'x-chat-ticket': ticket },
    signal: AbortSignal.timeout(config.requestTimeoutMs),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new ToolError(body?.detail ?? `PrepPros API returned HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

export const preppros = {
  listRecipes: (ticket: string) => request<Recipe[]>(ticket, 'GET', '/recipes'),
  getRecipe: (ticket: string, id: string) => request<Recipe>(ticket, 'GET', `/recipes/${encodeURIComponent(id)}`),
  bookmarkRecipe: (ticket: string, id: string) =>
    request<{ isBookmarked: boolean }>(ticket, 'PUT', `/recipes/${encodeURIComponent(id)}/bookmark`),
  listBookmarks: (ticket: string, category: string) =>
    request<Bookmark[]>(ticket, 'GET', `/bookmarks?category=${encodeURIComponent(category)}`),
};
