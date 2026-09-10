import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { useConfirm } from '@/components/confirm-dialog';
import { ThemedText } from '@/components/themed-text';
import type { WorkoutSet } from '@/db/schema';
import { exerciseMediaUrl } from '@/features/exercises/media';
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

  return (
    <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Image
          source={exerciseMediaUrl(entry.exercise.imagePath)}
          style={[styles.thumbnail, { backgroundColor: theme.backgroundElement }]}
          contentFit="cover"
          transition={120}
        />

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
          onChangeType={(type) => void updateSet(set.id, { type })}
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
  thumbnail: { width: 44, height: 44, borderRadius: 8 },
  headerText: { flex: 1, gap: 2 },
  title: { fontWeight: '700' },
  addSet: { marginHorizontal: 12, marginTop: 8, paddingVertical: 10 },
});
