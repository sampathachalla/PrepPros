import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MessageSquare } from 'lucide-react-native';
import { Brand } from '@/constants/Colors';
import { SUGGESTED_PROMPTS } from '../constants/chat';
import { useChatColors } from '../hooks/useChatColors';

interface ChatEmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
}

export function ChatEmptyState({ onSelectPrompt }: ChatEmptyStateProps) {
  const colors = useChatColors();

  return (
    <View style={styles.content}>
      <View style={[styles.iconCircle, { backgroundColor: colors.pinkTint }]}>
        <MessageSquare size={32} color={Brand.babyPink} />
      </View>
      <Text style={[styles.title, { color: colors.palette.text }]}>Your meal prep assistant</Text>
      <Text style={[styles.subtitle, { color: colors.palette.textMuted }]}>
        Ask for recipe ideas, prep plans or macro help. It can search your recipes and bookmarks.
      </Text>

      <View style={styles.prompts}>
        {SUGGESTED_PROMPTS.map((prompt) => (
          <Pressable
            key={prompt}
            onPress={() => onSelectPrompt(prompt)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.prompt,
              { borderColor: colors.palette.border, backgroundColor: colors.palette.surface },
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  prompts: {
    alignSelf: 'stretch',
    gap: 8,
  },
  prompt: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  promptText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
