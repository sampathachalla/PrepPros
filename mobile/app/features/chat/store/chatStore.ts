import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CHAT_STORAGE_KEY } from '../constants/chat';
import type { ChatMessage } from '../types/chat';
import { createId } from '../utils/chatUtils';

export interface StoredConversation {
  id: string;
  messages: ChatMessage[];
  updatedAt: string;
}

interface ChatState {
  /** The agent keeps this conversation's history; a new chat gets a new id. */
  conversationId: string;
  messages: ChatMessage[];
  /** Completed or previously opened conversations, newest first. */
  history: StoredConversation[];
  /** A reply is on its way; not persisted. */
  isSending: boolean;

  // Actions
  addMessage: (message: ChatMessage) => void;
  setMessageError: (messageId: string, error: string | undefined) => void;
  setSending: (isSending: boolean) => void;
  startNewChat: () => void;
  selectConversation: (conversationId: string) => void;
}

const savedConversation = (conversationId: string, messages: ChatMessage[]): StoredConversation => ({
  id: conversationId,
  messages,
  updatedAt: messages.at(-1)?.createdAt ?? new Date().toISOString(),
});

const archiveCurrent = (state: Pick<ChatState, 'conversationId' | 'messages' | 'history'>) =>
  state.messages.length === 0
    ? state.history
    : [
        savedConversation(state.conversationId, state.messages),
        ...state.history.filter((conversation) => conversation.id !== state.conversationId),
      ];

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      conversationId: createId(),
      messages: [],
      history: [],
      isSending: false,

      addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),

      setMessageError: (messageId, error) =>
        set((state) => ({
          messages: state.messages.map((message) => (message.id === messageId ? { ...message, error } : message)),
        })),

      setSending: (isSending) => set({ isSending }),

      startNewChat: () =>
        set((state) => ({
          conversationId: createId(),
          messages: [],
          history: archiveCurrent(state),
          isSending: false,
        })),

      selectConversation: (conversationId) =>
        set((state) => {
          if (conversationId === state.conversationId) return state;
          const selected = state.history.find((conversation) => conversation.id === conversationId);
          if (!selected) return state;
          return {
            conversationId: selected.id,
            messages: selected.messages,
            history: archiveCurrent(state).filter((conversation) => conversation.id !== selected.id),
            isSending: false,
          };
        }),
    }),
    {
      name: CHAT_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        conversationId: state.conversationId,
        messages: state.messages,
        history: state.history,
      }),
    },
  ),
);
