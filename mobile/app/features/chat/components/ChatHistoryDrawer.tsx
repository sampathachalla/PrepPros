import React, { useMemo } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { CookingPot, MessageSquare, SquarePen, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ChatMessage } from '../types/chat';
import type { StoredConversation } from '../store/chatStore';
import { useChatColors } from '../hooks/useChatColors';

interface ChatHistoryDrawerProps {
  visible: boolean;
  conversationId: string;
  messages: ChatMessage[];
  history: StoredConversation[];
  onClose: () => void;
  onNewChat: () => void;
  onOpenMealPrep: () => void;
  onSelect: (conversationId: string) => void;
}

const conversationTitle = (messages: ChatMessage[]) =>
  messages.find((message) => message.role === 'user')?.content.trim() || 'New chat';

export function ChatHistoryDrawer({
  visible,
  conversationId,
  messages,
  history,
  onClose,
  onNewChat,
  onOpenMealPrep,
  onSelect,
}: ChatHistoryDrawerProps) {
  const colors = useChatColors();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const conversations = useMemo(
    () => [
      ...(messages.length > 0
        ? [{ id: conversationId, messages, updatedAt: messages.at(-1)?.createdAt ?? '' }]
        : []),
      ...history,
    ],
    [conversationId, history, messages],
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.drawer,
            {
              width: Math.min(width * 0.86, 360),
              backgroundColor: colors.palette.surface,
              borderRightColor: colors.palette.border,
              paddingTop: insets.top + 12,
              paddingBottom: insets.bottom + 12,
            },
          ]}
        >
          <View style={styles.topRow}>
            <Text style={[styles.heading, { color: colors.palette.text }]}>PrepPros</Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close chat history"
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <X size={20} color={colors.palette.text} />
            </Pressable>
          </View>

          <Pressable
            onPress={onNewChat}
            accessibilityRole="button"
            accessibilityLabel="Start a new chat"
            style={({ pressed }) => [
              styles.newChat,
              { borderColor: colors.palette.border },
              pressed && styles.pressed,
            ]}
          >
            <SquarePen size={19} color={colors.palette.text} />
            <Text style={[styles.newChatText, { color: colors.palette.text }]}>New chat</Text>
          </Pressable>

          <Pressable
            onPress={onOpenMealPrep}
            accessibilityRole="button"
            accessibilityLabel="Open meal prep"
            style={({ pressed }) => [styles.drawerAction, pressed && styles.pressed]}
          >
            <CookingPot size={19} color={colors.palette.text} />
            <Text style={[styles.drawerActionText, { color: colors.palette.text }]}>Meal prep</Text>
          </Pressable>

          <Text style={[styles.sectionLabel, { color: colors.palette.textMuted }]}>Recent</Text>
          <FlatList
            data={conversations}
            keyExtractor={(conversation) => conversation.id}
            contentContainerStyle={conversations.length === 0 ? styles.emptyList : styles.list}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.palette.textMuted }]}>Your conversations will appear here.</Text>
            }
            renderItem={({ item }) => {
              const selected = item.id === conversationId;
              return (
                <Pressable
                  onPress={() => onSelect(item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open chat: ${conversationTitle(item.messages)}`}
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [
                    styles.chatRow,
                    selected && { backgroundColor: colors.palette.background },
                    pressed && styles.pressed,
                  ]}
                >
                  <MessageSquare size={17} color={selected ? colors.palette.text : colors.palette.textMuted} />
                  <Text
                    numberOfLines={1}
                    style={[styles.chatTitle, { color: selected ? colors.palette.text : colors.palette.textMuted }]}
                  >
                    {conversationTitle(item.messages)}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close chat history"
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.42)' },
  drawer: { paddingHorizontal: 16, borderRightWidth: StyleSheet.hairlineWidth },
  backdrop: { flex: 1 },
  topRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  heading: { fontSize: 24, fontWeight: '700' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  newChat: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, marginTop: 16 },
  newChatText: { fontSize: 15, fontWeight: '600' },
  drawerAction: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, paddingHorizontal: 14, marginTop: 4 },
  drawerActionText: { fontSize: 15, fontWeight: '600' },
  sectionLabel: { fontSize: 16, fontWeight: '700', marginTop: 28, marginBottom: 10, paddingHorizontal: 10 },
  list: { paddingBottom: 24 },
  emptyList: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 18 },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  chatRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 12, paddingHorizontal: 12 },
  chatTitle: { flex: 1, fontSize: 15, fontWeight: '500' },
  pressed: { opacity: 0.7 },
});
