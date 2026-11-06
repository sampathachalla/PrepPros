import { useLayoutEffect, useRef, useState } from 'react';
import { Animated, PanResponder } from 'react-native';
import { haptics } from '@/app/shared/services/haptics';
import { dragDirection, type SwipeDirection } from '../utils/swipeUtils';

interface UseSwipeOptions {
  /** How far to drag before letting go counts. */
  threshold: number;
  canSwipe: (direction: SwipeDirection) => boolean;
  onSwipe: (direction: SwipeDirection) => void;
}

/**
 * Lets a view be dragged sideways. Touch handlers offer a drag to the deepest view first, so a card
 * that can use it keeps it, and one that can't leaves it for the page around it.
 */
export function useSwipe(options: UseSwipeOptions) {
  const latest = useRef(options);
  useLayoutEffect(() => {
    latest.current = options;
  });

  const [translateX] = useState(() => new Animated.Value(0));

  // eslint-disable-next-line react-hooks/refs -- `latest` is only read in touch handlers, never while rendering
  const [responder] = useState(() => {
    const allowed = (dx: number) => latest.current.canSwipe(dx > 0 ? 'right' : 'left');
    let isArmed = false;
    const settle = () => Animated.spring(translateX, { toValue: 0, useNativeDriver: false }).start();

    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) => {
        const direction = dragDirection(dx, dy);
        return direction !== null && latest.current.canSwipe(direction);
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, { dx }) => {
        translateX.setValue(allowed(dx) ? dx : 0);
        const isPastThreshold = allowed(dx) && Math.abs(dx) >= latest.current.threshold;
        if (isPastThreshold && !isArmed) haptics.tick();
        isArmed = isPastThreshold;
      },
      onPanResponderRelease: (_, { dx }) => {
        isArmed = false;
        settle();
        if (Math.abs(dx) >= latest.current.threshold && allowed(dx)) latest.current.onSwipe(dx > 0 ? 'right' : 'left');
      },
      onPanResponderTerminate: () => {
        isArmed = false;
        settle();
      },
    });
  });

  return { translateX, panHandlers: responder.panHandlers };
}
