import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { memo, useCallback, useState } from 'react';
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
  updateWorkoutExerciseRest,
  type SetPatch,
} from '../mutations';
import { getLastPerformance, type WorkoutEntry } from '../queries';
import { useRestTimer } from '../rest-timer';
import { RestSheet, formatRest } from './rest-sheet';
import { SetRow, SetRowHeader } from './set-row';
import type { SetType } from './set-type-sheet';

function ExerciseCardComponent({
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
  const startRest = useRestTimer((state) => state.start);
  const [restSheetOpen, setRestSheetOpen] = useState(false);

  // Last time this exercise was trained, used only for the greyed-out hints.
  const { data: previousSets = [] } = useQuery({
    queryKey: ['last-performance', entry.exercise.id, workoutId],
    queryFn: () => getLastPerformance(entry.exercise.id, workoutId),
    enabled: editable,
    staleTime: Infinity,
  });

  // Stable across renders, so a memoised row is never invalidated by its own
  // callbacks. That is why they take the set id instead of closing over it.
  const handleChange = useCallback((setId: string, patch: SetPatch) => {
    void updateSet(setId, patch);
  }, []);

  const restSeconds = entry.restSeconds;

  const handleToggleCompleted = useCallback(
    (set: WorkoutSet, previous: WorkoutSet | null) => {
      void completeSet(set.id, {
        weight: previous?.weight ?? null,
        reps: previous?.reps ?? null,
        durationS: previous?.durationS ?? null,
        distanceM: previous?.distanceM ?? null,
      });

      // Checking a set starts the rest; unchecking one is a correction and must
      // not, so the rest only starts on the transition into "done".
      if (!set.completed && restSeconds) startRest(restSeconds);
    },
    [restSeconds, startRest]
  );

  const handleChangeType = useCallback((setId: string, type: SetType) => {
    void updateSet(setId, { type });
  }, []);

  const handleDelete = useCallback((setId: string) => {
    void deleteSet(setId);
  }, []);

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
    <View
      style={[
        styles.card,
        { backgroundColor: theme.background, borderColor: theme.border },
        // A superset is drawn as one block: its members share an accent edge.
        entry.supersetGroup !== null && { borderLeftWidth: 3, borderLeftColor: theme.accent },
      ]}>
      {entry.supersetGroup !== null ? (
        <ThemedText type="smallBold" style={[styles.superset, { color: theme.accentText }]}>
          SUPERSERIE {String.fromCharCode(64 + entry.supersetGroup)}
        </ThemedText>
      ) : null}

      <View style={styles.header}>
        <Image
          source={exerciseMediaUrl(entry.exercise.imagePath)}
          recyclingKey={entry.exercise.id}
          cachePolicy="memory-disk"
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
          <Pressable
            onPress={() => void confirmRemove()}
            hitSlop={8}
            accessibilityLabel="Quitar ejercicio">
            <Ionicons name="trash-outline" size={20} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {editable ? (
        <Pressable
          onPress={() => setRestSheetOpen(true)}
          style={({ pressed }) => [styles.rest, pressed && { opacity: 0.6 }]}>
          <Ionicons name="timer-outline" size={16} color={theme.accentText} />
          <ThemedText type="small" style={{ color: theme.accentText }}>
            Descanso: {formatRest(entry.restSeconds)}
          </ThemedText>
        </Pressable>
      ) : null}

      {restSheetOpen ? (
        <RestSheet
          current={entry.restSeconds}
          onSelect={(seconds) => {
            setRestSheetOpen(false);
            void updateWorkoutExerciseRest(entry.workoutExerciseId, seconds);
          }}
          onClose={() => setRestSheetOpen(false)}
        />
      ) : null}

      <SetRowHeader trackingType={entry.exercise.trackingType} />

      {entry.sets.map((set, index) => (
        <SetRow
          key={set.id}
          set={set}
          index={index}
          previous={previousSets[index] ?? null}
          trackingType={entry.exercise.trackingType}
          editable={editable}
          onChange={handleChange}
          onToggleCompleted={handleToggleCompleted}
          onChangeType={handleChangeType}
          onDelete={handleDelete}
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

/**
 * A session reload rebuilds every entry object, so the sets are compared by the
 * values this card draws. Without it, editing one exercise re-renders them all.
 */
export const ExerciseCard = memo(ExerciseCardComponent, (before, after) => {
  if (
    before.workoutId !== after.workoutId ||
    before.editable !== after.editable ||
    before.entry.workoutExerciseId !== after.entry.workoutExerciseId ||
    before.entry.exercise.id !== after.entry.exercise.id ||
    before.entry.notes !== after.entry.notes ||
    before.entry.supersetGroup !== after.entry.supersetGroup ||
    before.entry.restSeconds !== after.entry.restSeconds ||
    before.entry.sets.length !== after.entry.sets.length
  ) {
    return false;
  }

  return before.entry.sets.every((set, index) => {
    const other = after.entry.sets[index];

    return (
      set.id === other.id &&
      set.type === other.type &&
      set.completed === other.completed &&
      set.weight === other.weight &&
      set.reps === other.reps &&
      set.durationS === other.durationS &&
      set.distanceM === other.distanceM
    );
  });
});

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginBottom: 12,
    gap: 4,
  },
  superset: { paddingHorizontal: 12, paddingBottom: 2 },
  rest: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingTop: 6 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 12 },
  thumbnail: { width: 44, height: 44, borderRadius: 8 },
  headerText: { flex: 1, gap: 2 },
  title: { fontWeight: '700' },
  addSet: { marginHorizontal: 12, marginTop: 8, paddingVertical: 10 },
});
