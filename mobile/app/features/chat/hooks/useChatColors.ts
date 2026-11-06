import { AppTheme, AppThemeDark, Brand } from '@/constants/Colors';
import { useThemeContext } from '@/context/ThemeContext';

export function useChatColors() {
  const { theme } = useThemeContext();
  const isDark = theme === 'dark';
  const palette = isDark ? AppThemeDark : AppTheme;

  return {
    isDark,
    palette,
    userBubble: Brand.babyPink,
    userText: AppTheme.onPrimary,
    assistantBubble: isDark ? AppThemeDark.surface : '#F6F6F6',
    pinkTint: isDark ? 'rgba(245, 175, 196, 0.2)' : 'rgba(245, 175, 196, 0.35)',
    blueTint: isDark ? 'rgba(168, 221, 245, 0.16)' : 'rgba(168, 221, 245, 0.35)',
  };
}
