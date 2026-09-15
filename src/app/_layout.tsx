import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ConfirmProvider } from '@/components/confirm-dialog';
import { DatabaseProvider } from '@/db/provider';
import { UpdateProvider } from '@/features/updates/components/update-provider';
import { SessionNotifications } from '@/features/workout/components/session-notifications';

/**
 * Nothing is fetched from the network on a schedule: Open Food Facts lookups are
 * cached in SQLite, so a query only re-runs when the user asks for it again.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false },
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <DatabaseProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <ConfirmProvider>
              <UpdateProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="workout" options={{ headerShown: false }} />
                  <Stack.Screen name="exercise" options={{ headerShown: false }} />
                  <Stack.Screen name="routine" options={{ headerShown: false }} />
                  <Stack.Screen name="exercises" />
                  <Stack.Screen name="food" options={{ headerShown: false }} />
                  <Stack.Screen name="pick-exercise" options={{ presentation: 'modal' }} />
                </Stack>
                <StatusBar style="auto" />
                <SessionNotifications />
              </UpdateProvider>
            </ConfirmProvider>
          </ThemeProvider>
        </DatabaseProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
