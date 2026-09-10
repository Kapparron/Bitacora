import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ConfirmProvider } from '@/components/confirm-dialog';
import { DatabaseProvider } from '@/db/provider';
import { ActiveWorkoutBar } from '@/features/workout/components/active-workout-bar';

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
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="workout" options={{ headerShown: false }} />
                <Stack.Screen name="exercise" options={{ headerShown: false }} />
              </Stack>
              <ActiveWorkoutBar />
              <StatusBar style="auto" />
            </ConfirmProvider>
          </ThemeProvider>
        </DatabaseProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
