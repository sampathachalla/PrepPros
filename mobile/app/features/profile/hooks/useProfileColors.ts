import { AppTheme, AppThemeDark, Brand } from '@/constants/Colors';
import { useThemeContext } from '@/context/ThemeContext';

export interface ProfileColors {
  isDark: boolean;
  background: string;
  card: string;
  text: string;
  error: string;
  textMuted: string;
  border: string;
  primary: string;
  secondary: string;
  onPrimary: string;
  badgeTrainer: string;
  badgeMember: string;
}

export function useProfileColors(): ProfileColors {
  const { theme } = useThemeContext();
  const isDark = theme === 'dark';
  const palette = isDark ? AppThemeDark : AppTheme;

  return {
    isDark,
    background: palette.background,
    card: isDark ? '#12181C' : '#FFF8FB',
    text: palette.text,
    error: palette.error,
    textMuted: palette.textMuted,
    border: isDark ? 'rgba(168, 221, 245, 0.22)' : '#CFEAF7',
    primary: Brand.babyPink,
    secondary: Brand.babyBlue,
    onPrimary: Brand.black,
    badgeTrainer: Brand.babyBlue,
    badgeMember: Brand.babyPink,
  };
}
