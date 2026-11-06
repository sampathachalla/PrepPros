/** PrepPros tools the assistant can use (api/agent/agents/hermes/tools). */
export type ChatToolName = 'search_recipes' | 'get_recipe' | 'bookmark_recipe' | 'list_bookmarks';

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  /** Tools the assistant used to write this reply. */
  toolsUsed?: ChatToolName[];
  /** Set on a user message the assistant couldn't answer; it can be retried. */
  error?: string;
};

/** `POST /chat/messages` request body. */
export type SendChatMessagePayload = {
  conversationId: string;
  message: string;
};

/** `POST /chat/messages` response. */
export type SendChatMessageResponse = {
  conversationId: string;
  message: {
    id: string;
    role: 'assistant';
    content: string;
    toolsUsed: ChatToolName[];
    createdAt: string;
  };
};

/** A run of text in a message line; `bold` comes from **markdown**. */
export type InlineSegment = { text: string; bold: boolean };

export type MessageLine =
  | { kind: 'paragraph'; segments: InlineSegment[] }
  | { kind: 'bullet'; marker: string; segments: InlineSegment[] }
  | { kind: 'spacer' };
