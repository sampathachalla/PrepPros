import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Platform, View } from 'react-native';
// Update the import path if ThemeContext is actually in 'fitApp/context/ThemeContext'
import { ThemeProvider, useThemeContext } from '../context/ThemeContext';

// Load Tailwind styles only on web (for NativeWind)
if (typeof window !== 'undefined') {
  require('../global.css');
}

// 🔄 Custom inner layout wrapper to apply dynamic dark mode class
function ThemedLayoutWrapper() {
  const { theme } = useThemeContext();

  return (
    <SafeAreaProvider>
      {/* ⚠️ Apply dark mode class based on theme */}
      <View className={theme === 'dark' ? 'dark flex-1' : 'flex-1'}>
        <SafeAreaView className="flex-1 bg-background dark:bg-dark-background" edges={['top', 'left', 'right']}>
          <Stack screenOptions={{ headerShown: false }} />
          <StatusBar
            style={Platform.OS === 'android' ? 'light' : 'auto'}
            backgroundColor={Platform.OS === 'android' ? '#121212' : undefined}
          />
        </SafeAreaView>
      </View>
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