import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Platform, View } from 'react-native';
import { ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { ThemeProvider, useThemeContext } from '../context/ThemeContext';
import { DarkNavigationTheme, LightNavigationTheme } from '../constants/theme';
import { HeaderConfigProvider } from '../app/shared';

// Load Tailwind styles only on web (for NativeWind)
if (typeof window !== 'undefined') {
  require('../global.css');
}

// 🔄 Custom inner layout wrapper to apply dynamic dark mode class
function ThemedLayoutWrapper() {
  const { theme } = useThemeContext();

  const navigationTheme =
    theme === 'dark' ? DarkNavigationTheme : LightNavigationTheme;

  return (
    <SafeAreaProvider>
      <NavigationThemeProvider value={navigationTheme}>
        {/* ⚠️ Apply dark mode class based on theme */}
        <View className={theme === 'dark' ? 'dark flex-1' : 'flex-1'}>
          <HeaderConfigProvider>
            <SafeAreaView
              className="flex-1 bg-background dark:bg-dark-background"
              edges={['left', 'right']}
            >
              <Stack screenOptions={{ headerShown: false }} />
              <StatusBar style={Platform.OS === 'android' ? 'light' : 'auto'} />
            </SafeAreaView>
          </HeaderConfigProvider>
        </View>
      </NavigationThemeProvider>
    </SafeAreaProvider>
  );
}

// ✅ Final Export
export default function Layout() {
  return (
    <ThemeProvider>
      <ThemedLayoutWrapper />
    </ThemeProvider>
  );
}
