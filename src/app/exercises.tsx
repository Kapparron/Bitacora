import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { ExerciseList } from '@/features/exercises/exercise-list';
import { useTheme } from '@/hooks/use-theme';

/**
 * The exercise catalogue. It is reached from Rutinas rather than from a tab of
 * its own: it is a reference to look something up, not a place to work in.
 */
export default function ExercisesScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Ejercicios" />
      <ExerciseList />

      <Pressable
        onPress={() => router.push('/exercise/new')}
        accessibilityLabel="Nuevo ejercicio"
        style={({ pressed }) => [
          styles.add,
          { backgroundColor: theme.accent, shadowColor: theme.text },
          pressed && { opacity: 0.7 },
        ]}>
        <Ionicons name="add" size={30} color={theme.onAccent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  add: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});
