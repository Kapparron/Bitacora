import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { StyleSheet, View, type ColorValue } from 'react-native';

import { ActiveWorkoutBar } from '@/features/workout/components/active-workout-bar';
import { useTheme } from '@/hooks/use-theme';

/**
 * A tab's icon, on an accent disc while its tab is the one being shown. The
 * label alone reads the same in both states on a dark background, so the disc
 * is what says where you are.
 */
function TabIcon({
  name,
  color,
  size,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: ColorValue;
  size: number;
  focused: boolean;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.icon, focused && { backgroundColor: theme.accent }]}>
      <Ionicons name={name} color={focused ? theme.onAccent : String(color)} size={size} />
    </View>
  );
}

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
            tabBarIcon: (props) => <TabIcon name="home" {...props} />,
          }}
        />
        <Tabs.Screen
          name="routines"
          options={{
            title: 'Entrenos',
            tabBarIcon: (props) => <TabIcon name="barbell" {...props} />,
          }}
        />
        <Tabs.Screen
          name="nutrition"
          options={{
            title: 'Nutricion',
            tabBarIcon: (props) => <TabIcon name="restaurant" {...props} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Perfil',
            tabBarIcon: (props) => <TabIcon name="person" {...props} />,
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
  icon: {
    width: 44,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
