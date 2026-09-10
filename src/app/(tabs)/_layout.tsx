import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type AccessibilityState,
  type GestureResponderEvent,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ActiveWorkoutBar } from '@/features/workout/components/active-workout-bar';
import { useTheme } from '@/hooks/use-theme';

/**
 * A tab, drawn whole: the icon and its name inside one pill. The selected tab's
 * pill is filled with the accent colour and lifted above the bar, which is what
 * says where you are — the label alone reads much the same either way.
 */
function TabItem({
  name,
  label,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  focused: boolean;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.pill,
        focused && [styles.pillFocused, { backgroundColor: theme.accent, shadowColor: theme.text }],
      ]}>
      <Ionicons
        name={name}
        color={focused ? theme.onAccent : theme.textSecondary}
        size={focused ? 18 : 22}
      />
      <ThemedText
        type="small"
        style={[styles.label, { color: focused ? theme.onAccent : theme.textSecondary }]}>
        {label}
      </ThemedText>
    </View>
  );
}

/**
 * The pressable behind a tab. React Navigation's own draws a ripple on Android
 * and fades the item on press; both fight with the pill, so this one reports the
 * press and nothing else.
 */
function TabButton({
  children,
  onPress,
  onLongPress,
  accessibilityState,
}: {
  children?: ReactNode;
  onPress?: ((event: GestureResponderEvent) => void) | null;
  onLongPress?: ((event: GestureResponderEvent) => void) | null;
  accessibilityState?: AccessibilityState;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      android_ripple={null}
      style={styles.button}>
      {children}
    </Pressable>
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
          // The name is drawn inside the pill instead.
          tabBarShowLabel: false,
          tabBarButton: (props) => <TabButton {...props} />,
          tabBarStyle: { backgroundColor: theme.background, borderTopColor: theme.border },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ focused }) => <TabItem name="home" label="Inicio" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="routines"
          options={{
            title: 'Entrenos',
            tabBarIcon: ({ focused }) => (
              <TabItem name="barbell" label="Entrenos" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="nutrition"
          options={{
            title: 'Nutricion',
            tabBarIcon: ({ focused }) => (
              <TabItem name="restaurant" label="Nutricion" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ focused }) => <TabItem name="person" label="Perfil" focused={focused} />,
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
  button: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillFocused: {
    // Lifted clear of the bar, with a shadow under it, so the selected tab reads
    // as the one in front.
    transform: [{ translateY: -6 }],
    elevation: 6,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  label: { fontWeight: '700' },
});
