export type SwipeDirection = 'left' | 'right';

/** How far a finger must travel before a drag counts as a swipe at all. */
export const SWIPE_START_PX = 12;

/** The way a drag is heading, or null while it is too short or more up-and-down than sideways. */
export function dragDirection(dx: number, dy: number): SwipeDirection | null {
  const isSideways = Math.abs(dx) > SWIPE_START_PX && Math.abs(dx) > Math.abs(dy) * 1.5;
  if (!isSideways) return null;
  return dx > 0 ? 'right' : 'left';
}

/** Which page a three-page row has landed on: -1 the one before, 0 the middle, 1 the one after. */
export function swipedPage(offsetX: number, pageWidth: number): -1 | 0 | 1 {
  const page = Math.round(offsetX / pageWidth) - 1;
  if (page < 0) return -1;
  return page > 0 ? 1 : 0;
}
