/**
 * PrepPros brand palette — baby pink, baby blue, white, and black.
 * Keep Tailwind `tailwind.config.js` in sync with these values.
 */

export const Brand = {
  babyPink: '#F5AFC4',
  babyBlue: '#A8DDF5',
  white: '#FFFFFF',
  black: '#0A0A0A',
} as const;

export type BrandColor = (typeof Brand)[keyof typeof Brand];

/** Shared semantic tokens (light UI). */
export const AppTheme = {
  background: Brand.white,
  surface: Brand.white,
  text: Brand.black,
  textMuted: '#5C5C5C',
  primary: Brand.babyPink,
  secondary: Brand.babyBlue,
  accent: Brand.babyBlue,
  onPrimary: Brand.black,
  onSecondary: Brand.black,
  border: '#E3E3E3',
  borderActive: Brand.babyBlue,
  link: Brand.babyBlue,
  linkAlt: Brand.babyPink,
  icon: Brand.babyPink,
  error: '#C62828',
  success: '#2E7D32',
} as const;

export const AppThemeDark = {
  background: Brand.black,
  surface: '#141414',
  text: Brand.white,
  textMuted: '#B0B0B0',
  primary: Brand.babyPink,
  secondary: Brand.babyBlue,
  accent: Brand.babyBlue,
  onPrimary: Brand.black,
  onSecondary: Brand.black,
  border: '#2A2A2A',
  borderActive: Brand.babyBlue,
  link: Brand.babyBlue,
  linkAlt: Brand.babyPink,
  icon: Brand.babyBlue,
  error: '#EF5350',
  success: '#66BB6A',
} as const;

const tintColorLight = Brand.babyBlue;
const tintColorDark = Brand.babyPink;

export const Colors = {
  light: {
    text: AppTheme.text,
    background: AppTheme.background,
    tint: tintColorLight,
    icon: AppTheme.textMuted,
    tabIconDefault: AppTheme.textMuted,
    tabIconSelected: tintColorLight,
    primary: AppTheme.primary,
    secondary: AppTheme.secondary,
  },
  dark: {
    text: AppThemeDark.text,
    background: AppThemeDark.background,
    tint: tintColorDark,
    icon: AppThemeDark.textMuted,
    tabIconDefault: AppThemeDark.textMuted,
    tabIconSelected: tintColorDark,
    primary: AppThemeDark.primary,
    secondary: AppThemeDark.secondary,
  },
};
