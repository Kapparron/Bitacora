import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ConfirmProvider } from '@/components/confirm-dialog';
import { DatabaseProvider } from '@/db/provider';
import { UpdateProvider } from '@/features/updates/components/update-provider';
import { ReminderScheduler } from '@/features/reminders/components/reminder-scheduler';
import { SessionNotifications } from '@/features/workout/components/session-notifications';

/**
 * Only for the network, which today is Open Food Facts. The database is read
 * with `useLiveTables` (@/db/live), which re-runs on every write; a cache here
 * would not hear about those writes and would serve stale rows.
 *
 * Nothing is fetched on a schedule: a query only re-runs when the user asks.
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
                  <Stack.Screen name="note" options={{ headerShown: false }} />
                  <Stack.Screen name="event" options={{ headerShown: false }} />
                  <Stack.Screen name="task" options={{ headerShown: false }} />
                  <Stack.Screen name="pick-exercise" options={{ presentation: 'modal' }} />
                </Stack>
                <StatusBar style="auto" />
                <SessionNotifications />
                <ReminderScheduler />
              </UpdateProvider>
            </ConfirmProvider>
          </ThemeProvider>
        </DatabaseProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
