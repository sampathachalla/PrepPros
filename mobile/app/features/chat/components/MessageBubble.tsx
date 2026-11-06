import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertCircle, RotateCcw, Sparkles } from 'lucide-react-native';
import { TOOL_LABELS } from '../constants/chat';
import { useChatColors } from '../hooks/useChatColors';
import type { ChatMessage, InlineSegment } from '../types/chat';
import { parseMessage } from '../utils/chatUtils';

interface MessageBubbleProps {
  message: ChatMessage;
  onRetry?: (messageId: string) => void;
  retryDisabled?: boolean;
}

function Segments({ segments, color }: { segments: InlineSegment[]; color: string }) {
  return (
    <Text style={[styles.text, { color }]}>
      {segments.map((segment, index) => (
        <Text key={index} style={segment.bold ? styles.bold : undefined}>
          {segment.text}
        </Text>
      ))}
    </Text>
  );
}

function MessageBubbleBase({ message, onRetry, retryDisabled }: MessageBubbleProps) {
  const colors = useChatColors();
  const isUser = message.role === 'user';
  const textColor = isUser ? colors.userText : colors.palette.text;
  const lines = useMemo(() => parseMessage(message.content), [message.content]);

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.bubbleUser, { backgroundColor: colors.userBubble }]
            : [styles.bubbleAssistant, { backgroundColor: colors.assistantBubble }],
        ]}
      >
        {lines.map((line, index) => {
          if (line.kind === 'spacer') return <View key={index} style={styles.spacer} />;
          if (line.kind === 'bullet') {
            return (
              <View key={index} style={styles.bulletRow}>
                <Text style={[styles.text, styles.bulletMarker, { color: textColor }]}>{line.marker}</Text>
                <View style={styles.bulletBody}>
                  <Segments segments={line.segments} color={textColor} />
                </View>
              </View>
            );
          }
          return <Segments key={index} segments={line.segments} color={textColor} />;
        })}
      </View>

      {!isUser && message.toolsUsed && message.toolsUsed.length > 0 && (
        <View style={styles.tools}>
          {message.toolsUsed.map((tool) => (
            <View key={tool} style={[styles.toolChip, { backgroundColor: colors.blueTint }]}>
              <Sparkles size={11} color={colors.palette.textMuted} />
              <Text style={[styles.toolText, { color: colors.palette.textMuted }]}>{TOOL_LABELS[tool]}</Text>
            </View>
          ))}
        </View>
      )}

      {isUser && message.error && (
        <Pressable
          onPress={() => onRetry?.(message.id)}
          disabled={retryDisabled}
          accessibilityRole="button"
          accessibilityLabel={`${message.error} Retry`}
          hitSlop={8}
          style={styles.errorRow}
        >
          <AlertCircle size={13} color={colors.palette.error} />
          <Text style={[styles.errorText, { color: colors.palette.error }]}>{message.error}</Text>
          <RotateCcw size={13} color={colors.palette.error} />
          <Text style={[styles.retryText, { color: colors.palette.error }]}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
}

export const MessageBubble = memo(MessageBubbleBase);

const styles = StyleSheet.create({
  row: {
    marginBottom: 12,
    maxWidth: '86%',
  },
  rowUser: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  rowAssistant: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleUser: {
    borderBottomRightRadius: 6,
  },
  bubbleAssistant: {
    borderBottomLeftRadius: 6,
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
  },
  bold: {
    fontWeight: '700',
  },
  spacer: {
    height: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  bulletMarker: {
    minWidth: 18,
  },
  bulletBody: {
    flex: 1,
  },
  tools: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  toolText: {
    fontSize: 11,
    fontWeight: '600',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    flexShrink: 1,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
