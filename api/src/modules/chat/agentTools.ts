import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { resolveTicket } from './tickets.js';

const matchesToolsKey = (presented: string) => {
  const expected = Buffer.from(env.AGENT_TOOLS_KEY ?? '');
  const actual = Buffer.from(presented);
  return expected.length > 0 && actual.length === expected.length && timingSafeEqual(actual, expected);
};

/**
 * Guards the routes the Hermes container's PrepPros tools call: they must present the shared
 * AGENT_TOOLS_KEY and a live chat ticket, which sets `req.userId` to the user the ticket was issued to.
 */
export const requireAgentTools: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  const key = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
  if (!matchesToolsKey(key)) {
    throw new AppError(401, 'Invalid agent tools key');
  }

  const userId = resolveTicket(String(req.headers['x-chat-ticket'] ?? ''));
  if (!userId) {
    // Read by the model, so it says what to do next
    throw new AppError(401, 'This chat session has expired. Ask the user to send their message again.');
  }
  req.userId = userId;
  next();
};
