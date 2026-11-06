import { listBookmarksTool } from './bookmarks.tool.ts';
import { bookmarkRecipeTool, getRecipeTool, searchRecipesTool } from './recipes.tool.ts';

/** Every PrepPros tool Hermes can call; the API's chat module lists the same names. */
export const tools = [searchRecipesTool, getRecipeTool, bookmarkRecipeTool, listBookmarksTool];
