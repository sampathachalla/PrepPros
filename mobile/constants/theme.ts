import {
  DarkTheme,
  DefaultTheme,
  type Theme as NavigationTheme,
} from '@react-navigation/native';
import { AppTheme, AppThemeDark, Brand } from './Colors';

export { AppTheme, AppThemeDark, Brand, Colors } from './Colors';

export const LightNavigationTheme: NavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Brand.babyPink,
    background: AppTheme.background,
    card: AppTheme.surface,
    text: AppTheme.text,
    border: AppTheme.border,
    notification: Brand.babyBlue,
  },
};

export const DarkNavigationTheme: NavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Brand.babyPink,
    background: AppThemeDark.background,
    card: AppThemeDark.surface,
    text: AppThemeDark.text,
    border: AppThemeDark.border,
    notification: Brand.babyBlue,
  },
};

/** Shared auth screen styles — always use these instead of hard-coded hex. */
export const authStyles = {
  screen: { backgroundColor: AppTheme.background },
  title: { color: AppTheme.text },
  muted: { color: AppTheme.textMuted },
  link: { color: AppTheme.link },
  linkAlt: { color: AppTheme.linkAlt },
  button: { backgroundColor: Brand.babyPink },
  buttonText: { color: AppTheme.onPrimary },
  border: { borderColor: AppTheme.border },
  surface: { backgroundColor: AppTheme.surface },
} as const;
