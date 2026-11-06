import { AppTheme, AppThemeDark, Brand } from '@/constants/Colors';
import { useThemeContext } from '@/context/ThemeContext';

export interface CalendarColors {
  isDark: boolean;
  background: string;
  card: string;
  text: string;
  textMuted: string;
  border: string;
  icon: string;
  error: string;
  primary: string;
  onPrimary: string;
  secondarySoft: string;
  primarySoft: string;
  inputBackground: string;
  selectedCell: string;
  gridLine: string;
  secondary: string;
}

export function useCalendarColors(): CalendarColors {
  const { theme } = useThemeContext();
  const isDark = theme === 'dark';
  const palette = isDark ? AppThemeDark : AppTheme;

  // Surfaces are tinted toward baby blue (cards, borders) and baby pink (inputs, rows)
  // so the whole calendar reads as the brand palette rather than neutral gray.

  return {
    isDark,
    background: palette.background,
    card: isDark ? '#12181C' : '#FFF8FB',
    text: palette.text,
    textMuted: isDark ? '#B9CCD6' : '#5C6B73',
    border: isDark ? 'rgba(168, 221, 245, 0.22)' : '#CFEAF7',
    icon: palette.text,
    error: palette.error,
    primary: Brand.babyPink,
    onPrimary: Brand.black,
    secondarySoft: isDark ? 'rgba(168, 221, 245, 0.2)' : 'rgba(168, 221, 245, 0.4)',
    primarySoft: isDark ? 'rgba(245, 175, 196, 0.25)' : 'rgba(245, 175, 196, 0.35)',
    inputBackground: isDark ? '#1C1418' : '#F3FAFE',
    secondary: Brand.babyBlue,
    // Baby-blue tint for the selected day and faint baby-blue grid lines
    selectedCell: isDark ? 'rgba(168, 221, 245, 0.14)' : 'rgba(168, 221, 245, 0.25)',
    gridLine: isDark ? 'rgba(168, 221, 245, 0.16)' : 'rgba(168, 221, 245, 0.55)',
  };
}
