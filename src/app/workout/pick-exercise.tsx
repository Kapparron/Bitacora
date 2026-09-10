import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import type { Exercise } from '@/db/schema';
import { ExerciseList } from '@/features/exercises/exercise-list';
import { addExercisesToWorkout } from '@/features/workout/mutations';
import { useTheme } from '@/hooks/use-theme';

/**
 * Multi-select picker. Selection order is preserved so the exercises land in the
 * session in the order they were tapped.
 */
export default function PickExerciseScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(exercise: Exercise) {
    setSelected((current) =>
      current.includes(exercise.id)
        ? current.filter((id) => id !== exercise.id)
        : [...current, exercise.id]
    );
  }

  async function add() {
    await addExercisesToWorkout(workoutId, selected);
    router.back();
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ExerciseList selectedIds={new Set(selected)} onToggle={toggle} />

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Button
          title={selected.length === 0 ? 'Selecciona ejercicios' : `Anadir ${selected.length}`}
          disabled={selected.length === 0}
          onPress={() => void add()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  footer: { padding: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
