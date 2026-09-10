import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { useConfirm } from '@/components/confirm-dialog';
import { ThemedText } from '@/components/themed-text';
import type { WorkoutSet } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import {
  addSet,
  completeSet,
  deleteSet,
  removeWorkoutExercise,
  updateSet,
  type SetPatch,
} from '../mutations';
import { getLastPerformance, type WorkoutEntry } from '../queries';
import { SetRow, SetRowHeader } from './set-row';

/** Tapping the set number cycles through these. */
const SET_TYPE_ORDER = ['normal', 'warmup', 'drop', 'failure'] as const;

export function ExerciseCard({
  entry,
  workoutId,
  editable,
}: {
  entry: WorkoutEntry;
  workoutId: string;
  editable: boolean;
}) {
  const theme = useTheme();
  const confirm = useConfirm();

  // Last time this exercise was trained, used only for the greyed-out hints.
  const { data: previousSets = [] } = useQuery({
    queryKey: ['last-performance', entry.exercise.id, workoutId],
    queryFn: () => getLastPerformance(entry.exercise.id, workoutId),
    enabled: editable,
    staleTime: Infinity,
  });

  function previousFor(index: number): WorkoutSet | null {
    return previousSets[index] ?? null;
  }

  async function confirmRemove() {
    const accepted = await confirm({
      title: 'Quitar ejercicio',
      message: `Se quita "${entry.exercise.name}" y sus series.`,
      confirmLabel: 'Quitar',
      destructive: true,
    });

    if (accepted) await removeWorkoutExercise(entry.workoutExerciseId);
  }

  function cycleType(setId: string, current: (typeof SET_TYPE_ORDER)[number]) {
    const next = SET_TYPE_ORDER[(SET_TYPE_ORDER.indexOf(current) + 1) % SET_TYPE_ORDER.length];
    void updateSet(setId, { type: next });
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="default" style={styles.title}>
            {entry.exercise.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {entry.exercise.muscleGroup} · {entry.exercise.equipment}
          </ThemedText>
        </View>

        {editable ? (
          <Pressable onPress={() => void confirmRemove()} hitSlop={8} accessibilityLabel="Quitar ejercicio">
            <Ionicons name="trash-outline" size={20} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <SetRowHeader trackingType={entry.exercise.trackingType} />

      {entry.sets.map((set, index) => (
        <SetRow
          key={set.id}
          set={set}
          index={index}
          previous={previousFor(index)}
          trackingType={entry.exercise.trackingType}
          editable={editable}
          onChange={(patch: SetPatch) => void updateSet(set.id, patch)}
          onToggleCompleted={() => {
            const previous = previousFor(index);
            void completeSet(set.id, {
              weight: previous?.weight ?? null,
              reps: previous?.reps ?? null,
              durationS: previous?.durationS ?? null,
              distanceM: previous?.distanceM ?? null,
            });
          }}
          onCycleType={() => cycleType(set.id, set.type)}
          onDelete={() => void deleteSet(set.id)}
        />
      ))}

      {editable ? (
        <Button
          title="Anadir serie"
          variant="secondary"
          style={styles.addSet}
          onPress={() => void addSet(entry.workoutExerciseId)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginBottom: 12,
    gap: 4,
  },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 12 },
  headerText: { flex: 1, gap: 2 },
  title: { fontWeight: '700' },
  addSet: { marginHorizontal: 12, marginTop: 8, paddingVertical: 10 },
});
