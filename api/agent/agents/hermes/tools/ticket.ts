import { z } from 'zod';

/** Every tool takes the ticket the API put in the agent's instructions for this conversation. */
export const accessTicket = z
  .string()
  .min(20)
  .max(200)
  .describe('The access_ticket given in your instructions for this conversation. Copy it exactly.');
