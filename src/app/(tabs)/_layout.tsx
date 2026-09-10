import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ActiveWorkoutBar } from '@/features/workout/components/active-workout-bar';
import { useTheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          // The tab bar already names the tab; its header only repeated that
          // above the content, with a background of its own.
          headerShown: false,
          tabBarActiveTintColor: theme.text,
          tabBarInactiveTintColor: theme.textSecondary,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="routines"
          options={{
            title: 'Rutinas',
            tabBarIcon: ({ color, size }) => <Ionicons name="barbell" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="nutrition"
          options={{
            title: 'Nutricion',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="restaurant" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
          }}
        />
      </Tabs>

      {/* Overlays the tab screens, so it is hidden behind the session screen
          while that one is open and revealed as it slides away. */}
      <ActiveWorkoutBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
