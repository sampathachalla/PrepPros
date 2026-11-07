import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SUGGESTED_PROMPTS } from '../constants/chat';
import { useChatColors } from '../hooks/useChatColors';

interface ChatEmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
}

export function ChatEmptyState({ onSelectPrompt }: ChatEmptyStateProps) {
  const colors = useChatColors();

  return (
    <View style={styles.content}>
      <Text style={[styles.title, { color: colors.palette.text }]}>What can I help you prep?</Text>
      <Text style={[styles.subtitle, { color: colors.palette.textMuted }]}>
        Ask about recipes, meal plans, macros, or your saved dishes.
      </Text>

      <View style={styles.prompts}>
        {SUGGESTED_PROMPTS.map((prompt) => (
          <Pressable
            key={prompt}
            onPress={() => onSelectPrompt(prompt)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.prompt,
              { backgroundColor: colors.palette.surface },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.promptText, { color: colors.palette.text }]}>{prompt}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  prompts: {
    alignSelf: 'stretch',
    gap: 6,
  },
  prompt: {
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  promptText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
