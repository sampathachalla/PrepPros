import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ArrowUp } from 'lucide-react-native';
import { Brand } from '@/constants/Colors';
import { MAX_MESSAGE_LENGTH } from '../constants/chat';
import { useChatColors } from '../hooks/useChatColors';

interface ChatComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  canSend: boolean;
}

export function ChatComposer({ value, onChangeText, onSend, canSend }: ChatComposerProps) {
  const colors = useChatColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.palette.background }]}>
      <View style={[styles.field, { backgroundColor: colors.assistantBubble, borderColor: colors.palette.border }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Ask about recipes, prep or macros…"
          placeholderTextColor={colors.palette.textMuted}
          style={[styles.input, { color: colors.palette.text }]}
          multiline
          maxLength={MAX_MESSAGE_LENGTH}
          accessibilityLabel="Message"
        />
        <Pressable
          onPress={onSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !canSend }}
          hitSlop={6}
          style={({ pressed }) => [
            styles.sendButton,
            { backgroundColor: canSend ? Brand.babyPink : colors.palette.border },
            pressed && canSend && styles.pressed,
          ]}
        >
          <ArrowUp size={18} color={canSend ? Brand.black : colors.palette.textMuted} strokeWidth={2.5} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: 52,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: 14,
    paddingRight: 5,
    paddingVertical: 5,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 120,
    paddingTop: 7,
    paddingBottom: 7,
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  pressed: {
    opacity: 0.7,
  },
});
