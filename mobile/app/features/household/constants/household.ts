export const HOUSEHOLD_COPY = {
  setupTitle: 'Plan meals together',
  setupSubtitle: 'Start a household and invite the people you cook for, or join one with an invite link.',
  createTitle: 'Start a household',
  createHint: 'You’ll be the admin: you choose the dishes and start the timer.',
  joinTitle: 'Join a household',
  joinHint: 'Paste the invite link or code someone sent you.',
  inviteHint: 'For anyone new: send the link or code, and they join from PrepPros.',
  shareMessage: (name: string, link: string, code: string) =>
    `Join "${name}" on PrepPros to plan our meals together.\n\n${link}\n\nOr enter this code in the app: ${code}`,
} as const;

export const AVATAR_COLOR_OPTIONS = ['#F5AFC4', '#A8DDF5', '#EE93AF', '#7CC8EC', '#C9B6F2', '#A6E3C5', '#F9D48B', '#F4A79D'];
