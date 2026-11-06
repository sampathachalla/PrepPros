import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import {
  CalendarDays,
  ClipboardList,
  MessageSquare,
  Bookmark,
  User,
} from 'lucide-react-native';
import { Brand, AppTheme, AppThemeDark } from '@/constants/Colors';
import { useThemeContext } from '@/context/ThemeContext';
import { AppHeader } from '@/app/shared';
import { useBookmarkSync } from '@/app/features/bookmarks/hooks/useBookmarkSync';
import { HIDDEN_TAB_OPTIONS } from '@/app/features/navigation/constants/navigation';
import { useHouseholdSync } from '@/app/features/household/hooks/useHouseholdSync';
import { onSessionExpired } from '@/app/shared/services/apiClient';
import { clearSessionData } from '@/app/shared/services/sessionData';

export default function TabsLayout() {
  const { theme } = useThemeContext();
  const isDark = theme === 'dark';
  const router = useRouter();
  useBookmarkSync();
  useHouseholdSync();

  useEffect(
    () =>
      onSessionExpired(() => {
        clearSessionData();
        router.replace('/auth/login');
      }),
    [router],
  );

  const activeColor = Brand.babyPink;
  const inactiveColor = isDark ? AppThemeDark.textMuted : AppTheme.textMuted;
  const barBackground = isDark ? AppThemeDark.surface : AppTheme.surface;
  const borderColor = isDark ? AppThemeDark.border : AppTheme.border;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        // Custom header already includes status bar inside the 10% height.
        headerStatusBarHeight: 0,
        header: ({ options, route }) => (
          <AppHeader fallbackTitle={options.title ?? route.name} />
        ),
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor: barBackground,
          borderTopColor: borderColor,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <MessageSquare size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => (
            <CalendarDays size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color, size }) => (
            <ClipboardList size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: 'Bookmarks',
          tabBarIcon: ({ color, size }) => (
            <Bookmark size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <User size={size ?? 22} color={color} />
          ),
        }}
      />
      {/* Opened from the Chat header, so it has no tab of its own */}
      <Tabs.Screen name="meal-prep" options={{ title: 'Meal Prep', ...HIDDEN_TAB_OPTIONS }} />
    </Tabs>
  );
}
