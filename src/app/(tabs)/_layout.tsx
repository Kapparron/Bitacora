import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ActiveWorkoutBar } from '@/features/workout/components/active-workout-bar';
import { useTheme } from '@/hooks/use-theme';

/**
 * A whole tab: the pressable, the icon and the name, drawn as one pill.
 *
 * It replaces the bar's own button rather than filling its icon slot, which is
 * sized for an icon alone and so overlapped the name. Replacing the button also
 * drops the Android ripple and the press fade, both of which fought with the
 * pill.
 *
 * The selected tab is filled with the accent colour and lifted above the bar,
 * which is what says where you are: the name reads much the same either way.
 */
function TabButton({
  name,
  label,
  onPress,
  onLongPress,
  'aria-selected': focused = false,
}: {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: ((event: GestureResponderEvent) => void) | null;
  onLongPress?: ((event: GestureResponderEvent) => void) | null;
  /** How the bar reports which tab is showing. */
  'aria-selected'?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      android_ripple={null}
      style={styles.button}>
      <View
        style={[
          styles.pill,
          focused && [
            styles.pillFocused,
            { backgroundColor: theme.accent, shadowColor: theme.text },
          ],
        ]}>
        <Ionicons name={name} color={focused ? theme.onAccent : theme.textSecondary} size={20} />

        <ThemedText
          type="small"
          numberOfLines={1}
          style={[styles.label, { color: focused ? theme.onAccent : theme.textSecondary }]}>
          {label}
        </ThemedText>
      </View>
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
          // The icon and the name are both drawn by the button above.
          tabBarShowLabel: false,
          tabBarStyle: {
            height: 76,
            paddingTop: 14,
            // The selected pill sits above the bar's own edge.
            overflow: 'visible',
            backgroundColor: theme.background,
            borderTopColor: theme.border,
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inicio',
            tabBarButton: (props) => <TabButton {...props} name="home" label="Inicio" />,
          }}
        />
        <Tabs.Screen
          name="routines"
          options={{
            title: 'Entrenos',
            tabBarButton: (props) => <TabButton {...props} name="barbell" label="Entrenos" />,
          }}
        />
        <Tabs.Screen
          name="nutrition"
          options={{
            title: 'Nutricion',
            tabBarButton: (props) => <TabButton {...props} name="restaurant" label="Nutricion" />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Perfil',
            tabBarButton: (props) => <TabButton {...props} name="person" label="Perfil" />,
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
  button: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  pill: {
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pillFocused: {
    // Lifted clear of the bar and slightly larger, with a shadow under it, so
    // the selected tab reads as the one in front.
    transform: [{ translateY: -14 }, { scale: 1.06 }],
    elevation: 10,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  label: { fontSize: 11, lineHeight: 14, fontWeight: '700' },
});
