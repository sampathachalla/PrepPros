import { z } from 'zod';

export const researchRequestSchema = z.object({
  query: z.string().trim().min(3, 'query must contain at least 3 characters'),
  user_id: z.uuid().nullish(),
});

export const sendMessageSchema = z.object({
  /** Chosen by the app when a chat starts; the agent keeps the conversation's history under it. */
  conversationId: z.uuid('Invalid conversation id'),
  message: z
    .string()
    .trim()
    .min(1, 'Please type a message')
    .max(4000, 'Messages can be at most 4000 characters'),
});

export type ResearchRequest = z.infer<typeof researchRequestSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
