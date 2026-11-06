import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  useWindowDimensions,
  type ListRenderItem,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CookingPot, SquarePen } from 'lucide-react-native';
import { HEADER_HEIGHT_RATIO, HeaderIconButton, useScreenHeader } from '@/app/shared';
import { ChatComposer } from '../components/ChatComposer';
import { ChatEmptyState } from '../components/ChatEmptyState';
import { MessageBubble } from '../components/MessageBubble';
import { TypingIndicator } from '../components/TypingIndicator';
import { useChat } from '../hooks/useChat';
import { useChatColors } from '../hooks/useChatColors';
import type { ChatMessage } from '../types/chat';

export default function ChatScreen() {
  const colors = useChatColors();
  // AppHeader is custom-rendered by the tab layout, so React Navigation's
  // HeaderHeightContext is not available here. Keep this offset in step with
  // the shared header without requiring a navigation context.
  const { height: screenHeight } = useWindowDimensions();
  const headerHeight = Math.round(screenHeight * HEADER_HEIGHT_RATIO);
  const { messages, isSending, draft, setDraft, canSend, send, retry, newChat } = useChat();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const router = useRouter();
  const headerActions = useMemo(
    () => (
      <View style={styles.headerActions}>
        <HeaderIconButton
          label="Open meal prep"
          onPress={() => router.navigate('/(tabs)/meal-prep')}
          icon={CookingPot}
        />
        {messages.length > 0 ? (
          <HeaderIconButton label="Start a new chat" onPress={newChat} icon={SquarePen} />
        ) : null}
      </View>
    ),
    [messages.length, newChat, router],
  );
  useScreenHeader({ title: 'Chat', rightAction: headerActions });

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToEnd();
  }, [messages.length, isSending, scrollToEnd]);

  const renderItem = useCallback<ListRenderItem<ChatMessage>>(
    ({ item }) => <MessageBubble message={item} onRetry={retry} retryDisabled={isSending} />,
    [retry, isSending],
  );

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.palette.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      {messages.length === 0 ? (
        <ChatEmptyState onSelectPrompt={send} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(message) => message.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToEnd}
          ListFooterComponent={isSending ? TypingIndicator : undefined}
        />
      )}

      <ChatComposer value={draft} onChangeText={setDraft} onSend={() => send()} canSend={canSend} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
});
