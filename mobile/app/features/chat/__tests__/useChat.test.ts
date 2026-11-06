import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useChat } from '../hooks/useChat';
import { ChatServiceError, chatService } from '../services/chatService';
import { useChatStore } from '../store/chatStore';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('@/app/auth/store/authSession', () => ({ getAuthUser: jest.fn() }));

const reply = (content: string) => ({
  conversationId: useChatStore.getState().conversationId,
  message: {
    id: `reply-${content}`,
    role: 'assistant' as const,
    content,
    toolsUsed: ['search_recipes' as const],
    createdAt: new Date().toISOString(),
  },
});

describe('useChat', () => {
  beforeEach(() => {
    useChatStore.getState().startNewChat();
    jest.restoreAllMocks();
  });

  it('shows the user message, then the assistant reply', async () => {
    const sendMessage = jest.spyOn(chatService, 'sendMessage').mockResolvedValue(reply('Try oats'));
    const { result } = await renderHook(() => useChat());

    await act(() => result.current.send('  Breakfast ideas?  '));

    expect(result.current.messages[0]).toMatchObject({ role: 'user', content: 'Breakfast ideas?' });
    await waitFor(() => expect(result.current.messages).toHaveLength(2));
    expect(result.current.isSending).toBe(false);

    expect(sendMessage).toHaveBeenCalledWith({
      conversationId: useChatStore.getState().conversationId,
      message: 'Breakfast ideas?',
    });
    expect(result.current.messages[1]).toMatchObject({
      role: 'assistant',
      content: 'Try oats',
      toolsUsed: ['search_recipes'],
    });
  });

  it('marks the message failed and retries it', async () => {
    jest
      .spyOn(chatService, 'sendMessage')
      .mockRejectedValueOnce(new ChatServiceError('The assistant is busy'))
      .mockResolvedValueOnce(reply('Here you go'));
    const { result } = await renderHook(() => useChat());

    await act(() => result.current.send('Hi'));
    await waitFor(() => expect(result.current.messages[0].error).toBe('The assistant is busy'));

    await act(() => result.current.retry(result.current.messages[0].id));
    await waitFor(() => expect(result.current.messages).toHaveLength(2));
    expect(result.current.messages[0].error).toBeUndefined();
  });

  it('starts a new conversation and ignores the old one’s late reply', async () => {
    let resolve!: (value: ReturnType<typeof reply>) => void;
    jest.spyOn(chatService, 'sendMessage').mockReturnValue(new Promise((r) => (resolve = r)));
    const { result } = await renderHook(() => useChat());
    const firstConversation = useChatStore.getState().conversationId;

    await act(() => result.current.send('Hi'));
    expect(result.current.isSending).toBe(true);
    await act(() => result.current.newChat());
    await act(async () => resolve(reply('Too late')));

    expect(useChatStore.getState().conversationId).not.toBe(firstConversation);
    expect(result.current.messages).toEqual([]);
    expect(result.current.isSending).toBe(false);
  });

  it('ignores blank messages', async () => {
    const sendMessage = jest.spyOn(chatService, 'sendMessage');
    const { result } = await renderHook(() => useChat());

    await act(() => result.current.send('   '));

    expect(result.current.messages).toEqual([]);
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
