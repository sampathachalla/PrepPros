import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CHAT_STORAGE_KEY } from '../constants/chat';
import type { ChatMessage } from '../types/chat';
import { createId } from '../utils/chatUtils';

interface ChatState {
  /** The agent keeps this conversation's history; a new chat gets a new id. */
  conversationId: string;
  messages: ChatMessage[];
  /** A reply is on its way; not persisted. */
  isSending: boolean;

  // Actions
  addMessage: (message: ChatMessage) => void;
  setMessageError: (messageId: string, error: string | undefined) => void;
  setSending: (isSending: boolean) => void;
  startNewChat: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      conversationId: createId(),
      messages: [],
      isSending: false,

      addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),

      setMessageError: (messageId, error) =>
        set((state) => ({
          messages: state.messages.map((message) => (message.id === messageId ? { ...message, error } : message)),
        })),

      setSending: (isSending) => set({ isSending }),

      startNewChat: () => set({ conversationId: createId(), messages: [], isSending: false }),
    }),
    {
      name: CHAT_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ conversationId: state.conversationId, messages: state.messages }),
    },
  ),
);
