import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LucideIcon } from 'lucide-react-native';
import { AppTheme, AppThemeDark, Brand } from '@/constants/Colors';
import { useThemeContext } from '@/context/ThemeContext';
import { useHeaderSnapshot } from './screenHeader';

/** Wordmark aspect after trimming transparent PNG padding. */
const LOGO_ASPECT = 663 / 244;
/** Total header block height as a fraction of the window (includes status bar). */
export const HEADER_HEIGHT_RATIO = 0.1;

export interface AppHeaderProps {
  /** Used when the current page has not set its own title. */
  fallbackTitle?: string;
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  showMascot?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export function HeaderIconButton({
  label,
  onPress,
  icon: Icon,
}: {
  label: string;
  onPress: () => void;
  icon: LucideIcon;
}) {
  const { theme } = useThemeContext();
  const isDark = theme === 'dark';
  const palette = isDark ? AppThemeDark : AppTheme;

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[styles.iconButton, { backgroundColor: isDark ? AppThemeDark.surface : '#F2F2F7' }]}
    >
      <Icon size={18} color={palette.text} />
    </TouchableOpacity>
  );
}

export function AppHeader({
  fallbackTitle = '',
  title: titleProp,
  subtitle: subtitleProp,
  showLogo: showLogoProp,
  showMascot: showMascotProp,
  showBack: showBackProp,
  onBack: onBackProp,
  rightAction: rightActionProp,
}: AppHeaderProps) {
  const page = useHeaderSnapshot();
  const title = titleProp ?? page?.title ?? fallbackTitle;
  const subtitle = subtitleProp ?? page?.subtitle;
  const showLogo = showLogoProp ?? page?.showLogo ?? true;
  const showMascot = showMascotProp ?? page?.showMascot ?? showLogo;
  const showBack = showBackProp ?? page?.showBack ?? false;
  const onBack = onBackProp ?? page?.onBack;
  const rightAction = rightActionProp ?? page?.rightAction;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const { theme } = useThemeContext();
  const isDark = theme === 'dark';
  const palette = isDark ? AppThemeDark : AppTheme;

  // Exactly 10% of screen — status bar lives inside this, not above it.
  const headerHeight = Math.round(screenHeight * HEADER_HEIGHT_RATIO);
  const contentHeight = Math.max(headerHeight - insets.top, 24);

  const mascotSize = Math.max(32, contentHeight - 1);
  const backSpace = showBack ? 42 : 0;
  const leftLaneWidth = backSpace + (showMascot ? mascotSize : 0);
  const rightReserve = Math.round((screenWidth - 32) * 0.36);
  const maxLogoWidth = Math.max(
    Math.round(screenWidth - 32 - leftLaneWidth - rightReserve - 8),
    64,
  );
  const centerInset = Math.max(leftLaneWidth + 4, rightReserve);
  // Keep the wordmark inside the row below the status bar (not under the clock / island).
  let logoHeight = contentHeight;
  let logoWidth = Math.round(logoHeight * LOGO_ASPECT);
  if (logoWidth > maxLogoWidth) {
    logoWidth = Math.max(maxLogoWidth, 1);
    logoHeight = Math.round(logoWidth / LOGO_ASPECT);
  }

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          height: headerHeight,
          paddingTop: insets.top,
          backgroundColor: palette.background,
          borderBottomColor: palette.border,
        },
      ]}
    >
      <View style={[styles.content, { height: contentHeight }]}>
        <View style={[styles.leftSection, leftLaneWidth > 0 && { width: leftLaneWidth }]}>
          {showBack && (
            <TouchableOpacity
              onPress={handleBack}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[
                styles.backButton,
                { backgroundColor: isDark ? AppThemeDark.surface : '#F2F2F7' },
              ]}
            >
              <ChevronLeft size={20} color={palette.text} />
            </TouchableOpacity>
          )}
          {showMascot && (
            <Image
              source={require('../../../../assets/preppros-mascot.png')}
              style={{ width: mascotSize, height: mascotSize }}
              resizeMode="contain"
              accessibilityRole="image"
              accessibilityLabel="PrepPros panda chef mascot"
            />
          )}
        </View>

        {showLogo && (
          <View
            style={[styles.centerSection, { paddingHorizontal: centerInset }]}
            pointerEvents="none"
          >
            <Image
              source={require('../../../../assets/preppros-logo.png')}
              style={{ width: logoWidth, height: logoHeight }}
              resizeMode="contain"
              accessibilityRole="image"
              accessibilityLabel="PrepPros"
            />
          </View>
        )}

        <View style={styles.rightSection}>
          <View style={styles.titleSection} pointerEvents="none">
            <Text
              style={[
                styles.title,
                {
                  color: Brand.babyBlue,
                  fontSize: Math.min(22, Math.round(contentHeight * 0.42)),
                },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: palette.textMuted }]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {rightAction ? <View style={styles.actionContainer}>{rightAction}</View> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    position: 'relative',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    zIndex: 2,
  },
  centerSection: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginLeft: 'auto',
    zIndex: 1,
    gap: 10,
    maxWidth: '72%',
  },
  titleSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 1,
  },
  title: {
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  actionContainer: {
    alignItems: 'center',
  },
});

export default AppHeader;
