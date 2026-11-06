import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useChatColors } from '../hooks/useChatColors';

const DOT_COUNT = 3;

/** Bouncing dots shown while the assistant works on a reply. */
export function TypingIndicator() {
  const colors = useChatColors();
  const [dots] = useState(() =>
    Array.from({ length: DOT_COUNT }, () => new Animated.Value(0)),
  );

  useEffect(() => {
    const animation = Animated.loop(
      Animated.stagger(
        150,
        dots.map((dot) =>
          Animated.sequence([
            Animated.timing(dot, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(dot, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          ]),
        ),
      ),
    );
    animation.start();
    return () => animation.stop();
  }, [dots]);

  return (
    <View
      style={[styles.bubble, { backgroundColor: colors.assistantBubble }]}
      accessibilityLabel="The assistant is typing"
      accessibilityLiveRegion="polite"
    >
      {dots.map((dot, index) => (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            { backgroundColor: colors.palette.textMuted },
            {
              opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
              transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    marginBottom: 12,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
