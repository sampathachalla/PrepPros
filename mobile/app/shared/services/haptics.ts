import * as Haptics from 'expo-haptics';

/** Haptics are a nicety: a phone without them should simply stay still, never show an error. */
const play = (effect: () => Promise<void>) => {
  Promise.resolve().then(effect).catch(() => undefined);
};

export const haptics = {
  /** Moving between things: a day, a week, a view. */
  selection: () => play(() => Haptics.selectionAsync()),
  /** A swipe reaching the point where letting go will count. */
  tick: () => play(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** About to do something that needs a second thought. */
  press: () => play(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => play(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => play(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
