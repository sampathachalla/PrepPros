import { MAX_MESSAGE_LENGTH } from '../constants/chat';

export type MessageValidation = { ok: true; message: string } | { ok: false; error: string };

/** Trims the draft and checks it against the API's rules. */
export function validateChatMessage(draft: string): MessageValidation {
  const message = draft.trim();
  if (!message) return { ok: false, error: 'Please type a message' };
  if (message.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `Messages can be at most ${MAX_MESSAGE_LENGTH} characters` };
  }
  return { ok: true, message };
}
