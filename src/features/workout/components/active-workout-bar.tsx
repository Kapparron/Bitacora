import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, usePathname } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/lib/format';
import { useActiveWorkout } from '../queries';
import { useElapsed } from '../use-elapsed';

/**
 * Floating reminder that a session is in progress, so leaving the workout screen
 * to look something up never loses the way back. Hidden on the session screen
 * itself, where it would be redundant.
 */
export function ActiveWorkoutBar() {
  const theme = useTheme();
  const pathname = usePathname();
  const { contents } = useActiveWorkout();
  const elapsed = useElapsed(contents?.workout.startedAt ?? null);

  if (!contents || pathname === '/workout/active') return null;

  const setCount = contents.entries.reduce(
    (total, entry) => total + entry.sets.filter((set) => set.completed).length,
    0
  );

  return (
    <Link href="/workout/active" asChild>
      <Pressable
        style={[styles.bar, { backgroundColor: theme.accent, bottom: BottomTabInset + 8 }]}
        accessibilityRole="button">
        <Ionicons name="barbell" size={20} color={theme.onAccent} />
        <View style={styles.text}>
          <ThemedText type="small" style={{ color: theme.onAccent, fontWeight: '700' }}>
            {contents.workout.name}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.onAccent }}>
            {formatDuration(elapsed)} · {setCount} series
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.onAccent} />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  text: { flex: 1, gap: 2 },
});
