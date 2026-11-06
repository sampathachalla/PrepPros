import { randomBytes } from 'node:crypto';

/**
 * Chat tickets let the Hermes agent's tools act for the app user in one conversation. MCP servers
 * can't receive per-request identity, so the API hands the agent an opaque ticket in its instructions
 * and the tools send it back; the user id itself never reaches the model.
 *
 * In-process: fine for a single API container. A restart only means the next message gets a new
 * ticket. Use a shared store if the API is scaled out.
 */
const TICKET_TTL_MS = 30 * 60 * 1000;

type Ticket = { userId: string; conversationKey: string; expiresAt: number };

const tickets = new Map<string, Ticket>();
const ticketByConversation = new Map<string, string>();

function sweepExpired(now: number) {
  for (const [ticket, entry] of tickets) {
    if (entry.expiresAt <= now) {
      tickets.delete(ticket);
      if (ticketByConversation.get(entry.conversationKey) === ticket) ticketByConversation.delete(entry.conversationKey);
    }
  }
}

/**
 * The ticket for this user's conversation, reused (and extended) while it is live: earlier tool calls
 * in the conversation's history then still carry a valid ticket.
 */
export function issueTicket(userId: string, conversationKey: string, now = Date.now()) {
  sweepExpired(now);
  const expiresAt = now + TICKET_TTL_MS;

  const existing = ticketByConversation.get(conversationKey);
  const entry = existing ? tickets.get(existing) : undefined;
  if (existing && entry) {
    entry.expiresAt = expiresAt;
    return existing;
  }

  const ticket = randomBytes(24).toString('base64url');
  tickets.set(ticket, { userId, conversationKey, expiresAt });
  ticketByConversation.set(conversationKey, ticket);
  return ticket;
}

/** The user a live ticket was issued to, or null. */
export function resolveTicket(ticket: string, now = Date.now()) {
  const entry = tickets.get(ticket);
  if (!entry || entry.expiresAt <= now) return null;
  return entry.userId;
}

/** Forgets every ticket (used between tests). */
export function resetChatTickets() {
  tickets.clear();
  ticketByConversation.clear();
}
