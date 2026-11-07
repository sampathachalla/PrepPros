import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Menu, SquarePen } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatComposer } from '../components/ChatComposer';
import { ChatEmptyState } from '../components/ChatEmptyState';
import { ChatHistoryDrawer } from '../components/ChatHistoryDrawer';
import { MessageBubble } from '../components/MessageBubble';
import { TypingIndicator } from '../components/TypingIndicator';
import { useChat } from '../hooks/useChat';
import { useChatColors } from '../hooks/useChatColors';
import type { ChatMessage } from '../types/chat';

export default function ChatScreen() {
  const colors = useChatColors();
  const {
    conversationId,
    history,
    messages,
    isSending,
    draft,
    setDraft,
    canSend,
    send,
    retry,
    newChat,
    selectConversation,
  } = useChat();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const router = useRouter();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.palette.background }]} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => setIsHistoryOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open chat history"
          style={({ pressed }) => [
            styles.topButton,
            { backgroundColor: colors.palette.surface, borderColor: colors.palette.border },
            pressed && styles.pressed,
          ]}
        >
          <Menu size={22} color={colors.palette.text} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.palette.text }]}>PrepPros</Text>
        <Pressable
          onPress={newChat}
          accessibilityRole="button"
          accessibilityLabel="Start a new chat"
          style={({ pressed }) => [
            styles.topButton,
            { backgroundColor: colors.palette.surface, borderColor: colors.palette.border },
            pressed && styles.pressed,
          ]}
        >
          <SquarePen size={22} color={colors.palette.text} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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

        <ChatComposer
          value={draft}
          onChangeText={setDraft}
          onSend={() => send()}
          canSend={canSend}
        />
      </KeyboardAvoidingView>

      <ChatHistoryDrawer
        visible={isHistoryOpen}
        conversationId={conversationId}
        messages={messages}
        history={history}
        onClose={() => setIsHistoryOpen(false)}
        onNewChat={() => {
          newChat();
          setIsHistoryOpen(false);
        }}
        onOpenMealPrep={() => {
          setIsHistoryOpen(false);
          router.navigate('/(tabs)/meal-prep');
        }}
        onSelect={(id) => {
          selectConversation(id);
          setIsHistoryOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  screen: {
    flex: 1,
  },
  topBar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  topButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 12,
  },
  pressed: { opacity: 0.65 },
});
