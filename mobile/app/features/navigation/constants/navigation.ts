export const TAB_ROUTES = {
  chat: {
    name: 'chat',
    title: 'Chat',
  },
  calendar: {
    name: 'calendar',
    title: 'Calendar',
  },
  plan: {
    name: 'plan',
    title: 'Plan',
  },
  bookmarks: {
    name: 'bookmarks',
    title: 'Bookmarks',
  },
  profile: {
    name: 'profile',
    title: 'Profile',
  },
} as const;

export type TabRouteKey = keyof typeof TAB_ROUTES;

/**
 * For a page that lives in the tabs but has no button in the bar. Don't use `href: null` for this:
 * expo-router treats that tab as disabled and sends anyone who opens it back to a visible tab.
 */
export const HIDDEN_TAB_OPTIONS = {
  tabBarButton: () => null,
  tabBarItemStyle: { display: 'none' },
} as const;
