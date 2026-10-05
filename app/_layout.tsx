import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { SyncStatusBar } from '@/components/ui/sync-status-bar';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { startSyncEngine } from '@/lib/offline/sync';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Keep the device copy of jobs fresh and upload offline changes in the background.
  useEffect(() => {
    startSyncEngine();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Public pages (no login), linked from the QuickBooks app listing. */}
        <Stack.Screen name="privacy" options={{ headerShown: false, title: 'Privacy Policy' }} />
        <Stack.Screen name="terms" options={{ headerShown: false, title: 'Terms of Use' }} />
      </Stack>
      <SyncStatusBar />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
