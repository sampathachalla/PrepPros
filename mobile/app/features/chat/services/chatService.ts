import axios, { isAxiosError } from 'axios';
import { getAccessToken } from '@/app/shared/services/apiClient';
import { API_URL, CHAT_REQUEST_TIMEOUT_MS } from '../constants/chat';
import type { SendChatMessagePayload, SendChatMessageResponse } from '../types/chat';

/** An error whose message can be shown in the chat. */
export class ChatServiceError extends Error {}

function toChatError(error: unknown): ChatServiceError {
  if (isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail;
    if (error.response?.status === 401) return new ChatServiceError('Please log in again to use chat.');
    if (typeof detail === 'string') return new ChatServiceError(detail);
    if (error.code === 'ECONNABORTED') return new ChatServiceError('The assistant took too long to answer.');
    if (!error.response) return new ChatServiceError('Can’t reach PrepPros. Check your connection.');
  }
  return new ChatServiceError('Something went wrong. Please try again.');
}

/**
 * Chat Service layer: talks to api/src/modules/chat, which relays the message to the Hermes
 * agent and returns its reply.
 */
export const chatService = {
  async sendMessage(payload: SendChatMessagePayload): Promise<SendChatMessageResponse> {
    const accessToken = await getAccessToken().catch(() => null);
    if (!accessToken) {
      throw new ChatServiceError('Please log in again to use chat.');
    }

    try {
      const res = await axios.post<SendChatMessageResponse>(`${API_URL}/chat/messages`, payload, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: CHAT_REQUEST_TIMEOUT_MS,
      });
      return res.data;
    } catch (error) {
      throw toChatError(error);
    }
  },
};
