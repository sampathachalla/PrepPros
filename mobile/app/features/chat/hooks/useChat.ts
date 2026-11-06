import { useCallback, useState } from 'react';
import { ChatServiceError, chatService } from '../services/chatService';
import { useChatStore } from '../store/chatStore';
import type { ChatMessage } from '../types/chat';
import { createId } from '../utils/chatUtils';
import { validateChatMessage } from '../validators/chatValidators';

export function useChat() {
  const messages = useChatStore((s) => s.messages);
  const isSending = useChatStore((s) => s.isSending);
  const startNewChat = useChatStore((s) => s.startNewChat);

  const [draft, setDraft] = useState('');

  /** Asks the assistant about an already-shown user message; marks the message failed on error. */
  const requestReply = useCallback(async (userMessage: ChatMessage) => {
    const store = useChatStore.getState();
    const conversationId = store.conversationId;
    store.setMessageError(userMessage.id, undefined);
    store.setSending(true);

    try {
      const { message } = await chatService.sendMessage({ conversationId, message: userMessage.content });
      // Drop replies to a chat the user has since cleared
      if (useChatStore.getState().conversationId !== conversationId) return;
      useChatStore.getState().addMessage({
        id: message.id,
        role: 'assistant',
        content: message.content,
        toolsUsed: message.toolsUsed,
        createdAt: message.createdAt,
      });
    } catch (error) {
      if (useChatStore.getState().conversationId !== conversationId) return;
      const text = error instanceof ChatServiceError ? error.message : 'Something went wrong. Please try again.';
      useChatStore.getState().setMessageError(userMessage.id, text);
    } finally {
      if (useChatStore.getState().conversationId === conversationId) useChatStore.getState().setSending(false);
    }
  }, []);

  const send = useCallback(
    (text: string = draft) => {
      if (useChatStore.getState().isSending) return;
      const result = validateChatMessage(text);
      if (!result.ok) return;

      const userMessage: ChatMessage = {
        id: createId(),
        role: 'user',
        content: result.message,
        createdAt: new Date().toISOString(),
      };
      useChatStore.getState().addMessage(userMessage);
      setDraft('');
      void requestReply(userMessage);
    },
    [draft, requestReply],
  );

  const retry = useCallback(
    (messageId: string) => {
      if (useChatStore.getState().isSending) return;
      const message = useChatStore.getState().messages.find((m) => m.id === messageId);
      if (message?.role === 'user') void requestReply(message);
    },
    [requestReply],
  );

  const newChat = useCallback(() => {
    startNewChat();
    setDraft('');
  }, [startNewChat]);

  return {
    messages,
    isSending,
    draft,
    setDraft,
    canSend: !isSending && validateChatMessage(draft).ok,
    send,
    retry,
    newChat,
  };
}
