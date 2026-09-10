import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/screen-header';
import type { Exercise } from '@/db/schema';
import { ExerciseList } from '@/features/exercises/exercise-list';
import { addExercisesToRoutine } from '@/features/routines/mutations';
import { addExercisesToWorkout } from '@/features/workout/mutations';
import { useTheme } from '@/hooks/use-theme';

/**
 * Multi-select picker shared by the active session and the routine editor.
 * `target` says where the chosen exercises are appended; selection order is
 * preserved so they land in the order they were tapped.
 */
export default function PickExerciseScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { target, id } = useLocalSearchParams<{ target: 'workout' | 'routine'; id: string }>();
  const [selected, setSelected] = useState<string[]>([]);

  // Rebuilt only when the selection changes, so the list rows keep a stable prop.
  const selectedIds = useMemo(() => new Set(selected), [selected]);

  const toggle = useCallback((exercise: Exercise) => {
    setSelected((current) =>
      current.includes(exercise.id)
        ? current.filter((one) => one !== exercise.id)
        : [...current, exercise.id]
    );
  }, []);

  async function add() {
    if (target === 'routine') await addExercisesToRoutine(id, selected);
    else await addExercisesToWorkout(id, selected);

    router.back();
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Anadir ejercicio" />

      <ExerciseList selectedIds={selectedIds} onToggle={toggle} />

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
