import { randomUUID } from 'node:crypto';
import { AppError } from '../../utils/AppError.js';
import { askAgent } from './hermes.js';
import * as repository from './repository.js';
import type { ResearchRequest, SendMessageInput } from './schema.js';
import { issueTicket } from './tickets.js';

const RESEARCH_INSTRUCTIONS =
  'This is a one-off research question without access to anyone’s PrepPros account: do not call any ' +
  'tools. Distinguish facts from assumptions and never invent citations or claim to have browsed sources.';

/** Records a research session, asks the Hermes agent, and stores its answer. */
export async function runResearch({ query, user_id: userId = null }: ResearchRequest) {
  const { id } = await repository.createRunningSession(userId, query);

  try {
    const reply = await askAgent({ input: query, instructions: RESEARCH_INSTRUCTIONS });
    const result = { answer: reply.text };
    await repository.completeSession(id, result);
    return { id, status: 'completed' as const, result };
  } catch (error) {
    await repository.failSession(id).catch(() => undefined);
    throw error instanceof AppError ? error : new AppError(502, 'The requested backend service is unavailable');
  }
}

/** Hermes keeps each conversation's history under this name; the user id keeps them private. */
export const conversationKey = (userId: string, conversationId: string) =>
  `preppros:${userId}:${conversationId}`;

/** Sends the user's message to the Hermes agent and returns its reply. */
export async function sendMessage(userId: string, { conversationId, message }: SendMessageInput, now = new Date()) {
  const key = conversationKey(userId, conversationId);
  const ticket = issueTicket(userId, key);

  const reply = await askAgent({
    input: message,
    conversation: key,
    instructions: `access_ticket: ${ticket}\nToday's date: ${now.toISOString().slice(0, 10)}`,
  });

  return {
    conversationId,
    message: {
      id: randomUUID(),
      role: 'assistant' as const,
      content: reply.text,
      toolsUsed: reply.toolsUsed,
      createdAt: new Date().toISOString(),
    },
  };
}
