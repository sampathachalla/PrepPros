import { createContext, useContext } from 'react';

/** Lets a swipeable card hold the day pager still, so a swipe on the card can't also turn the day. */
export const DayPagerLockContext = createContext<(locked: boolean) => void>(() => undefined);

export const useDayPagerLock = () => useContext(DayPagerLockContext);
