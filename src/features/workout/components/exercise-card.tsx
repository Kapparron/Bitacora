import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { memo, useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { useConfirm } from '@/components/confirm-dialog';
import { OptionSheet, type SheetOption } from '@/components/option-sheet';
import { ThemedText } from '@/components/themed-text';
import type { WorkoutSet } from '@/db/schema';
import { ExerciseThumbnail } from '@/features/exercises/components/exercise-thumbnail';
import { useTheme } from '@/hooks/use-theme';
import { formatRest } from '@/lib/format';
import {
  addDropSet,
  addSet,
  addThreeSevenSeries,
  completeSet,
  linkWorkoutWithNext,
  unlinkWorkoutSuperset,
  deleteSet,
  removeWorkoutExercise,
  updateSet,
  updateWorkoutExerciseRest,
  type SetPatch,
} from '../mutations';
import { useExerciseRecords, useLastPerformance, type WorkoutEntry } from '../queries';
import { RECORD_LABEL, recordsReachedBy } from '../set-records';
import { restAfter } from '../rest-after';
import { chainsOf } from '../set-chains';
import { useRestTimer } from '../rest-timer';
import { ExerciseNote } from './exercise-note';
import { RecordBubble } from './record-bubble';
import { RestSheet } from './rest-sheet';
import { SetRow, SetRowHeader } from './set-row';
import { badgeFor, type SetType } from './set-type-sheet';

const ADD_OPTIONS: SheetOption<'drop' | 'three_seven' | null>[] = [
  { value: 'drop', label: 'Drop set', badge: 'D', description: 'Un quinto mas ligero, sin descanso' },
  { value: 'three_seven', label: 'Serie 3/7', badge: '3/7', description: 'De 3 a 7 reps con descansos cortos' },
];

function ExerciseCardComponent({
  entry,
  workoutId,
  editable,
  onReorder,
  closesGroup,
  canLink,
}: {
  entry: WorkoutEntry;
  workoutId: string;
  editable: boolean;
  /** Opens the reorder sheet. Left out when there is nothing to reorder. */
  onReorder?: () => void;
  /** False while this exercise is followed, in its superset, by another. */
  closesGroup: boolean;
  /** There is an exercise after this one to join. */
  canLink: boolean;
}) {
  const theme = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const startRest = useRestTimer((state) => state.start);
  const [restSheetOpen, setRestSheetOpen] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  /** What the bubble is announcing, or null while there is nothing to say. */
  const [bubble, setBubble] = useState<string | null>(null);

  const records = useExerciseRecords(entry.exercise.id);

  // Last time this exercise was trained, used only for the greyed-out hints.
  const previousSets = useLastPerformance(entry.exercise.id, workoutId, editable);

  // Stable across renders, so a memoised row is never invalidated by its own
  // callbacks. That is why they take the set id instead of closing over it.
  const handleChange = useCallback((setId: string, patch: SetPatch) => {
    void updateSet(setId, patch);
  }, []);

  const restSeconds = entry.restSeconds;
  const sets = entry.sets;

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
      if (set.completed) return;

      // Inside a superset the next exercise follows straight away.
      if (closesGroup) startRest(restAfter(sets, sets.findIndex((other) => other.id === set.id), restSeconds));

      // The set is about to count, so it is measured as completed. Only the
      // first record reached is announced: two bubbles at once read as noise.
      const reached = recordsReachedBy({ ...set, completed: true }, records);
      if (reached.length > 0) setBubble(`Record de ${RECORD_LABEL[reached[0]].toLowerCase()}`);
    },
    [sets, restSeconds, startRest, records, closesGroup]
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
        // Members of a superset sit close together, as one block.
        entry.supersetGroup !== null && !closesGroup && styles.inGroup,
      ]}>
      {entry.supersetGroup !== null ? (
        <ThemedText type="smallBold" style={[styles.superset, { color: theme.accentText }]}>
          SUPERSERIE {String.fromCharCode(64 + entry.supersetGroup)}
        </ThemedText>
      ) : null}

      <View style={styles.header}>
        <ExerciseThumbnail exercise={entry.exercise} />

        <View style={styles.headerText}>
          <ThemedText type="default" style={styles.title}>
            {entry.exercise.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {entry.exercise.muscleGroup} · {entry.exercise.equipment}
          </ThemedText>
        </View>

        {editable ? (
          <View style={styles.headerActions}>
            {onReorder ? (
              <Pressable onPress={onReorder} hitSlop={8} accessibilityLabel="Reordenar ejercicios">
                <Ionicons name="reorder-three" size={22} color={theme.textSecondary} />
              </Pressable>
            ) : null}

            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/pick-exercise',
                  params: { target: 'replace', id: entry.workoutExerciseId },
                })
              }
              hitSlop={8}
              accessibilityLabel="Cambiar ejercicio">
              <Ionicons name="swap-horizontal" size={20} color={theme.textSecondary} />
            </Pressable>

            {entry.supersetGroup !== null || canLink ? (
              <Pressable
                onPress={() =>
                  void (entry.supersetGroup !== null
                    ? unlinkWorkoutSuperset(entry.workoutExerciseId)
                    : linkWorkoutWithNext(entry.workoutExerciseId))
                }
                hitSlop={8}
                accessibilityLabel={
                  entry.supersetGroup !== null ? 'Separar de la superserie' : 'Unir con el siguiente'
                }>
                <Ionicons
                  name={entry.supersetGroup !== null ? 'unlink' : 'link'}
                  size={20}
                  color={entry.supersetGroup !== null ? theme.accentText : theme.textSecondary}
                />
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => void confirmRemove()}
              hitSlop={8}
              accessibilityLabel="Quitar ejercicio">
              <Ionicons name="trash-outline" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>
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

      {addSheetOpen ? (
        <OptionSheet<'drop' | 'three_seven' | null>
          title="Anadir"
          options={ADD_OPTIONS}
          current={null}
          onSelect={(kind) => {
            setAddSheetOpen(false);
            if (kind === 'drop') void addDropSet(entry.workoutExerciseId);
            if (kind === 'three_seven') void addThreeSevenSeries(entry.workoutExerciseId);
          }}
          onClose={() => setAddSheetOpen(false)}
        />
      ) : null}

      <ExerciseNote
        workoutExerciseId={entry.workoutExerciseId}
        notes={entry.notes}
        editable={editable}
      />

      <SetRowHeader trackingType={entry.exercise.trackingType} />

      {bubble ? <RecordBubble label={bubble} onDone={() => setBubble(null)} /> : null}

      {chainsOf(entry.sets).map((chain) => {
        const rows = chain.map((index) => {
          const set = entry.sets[index];

          return (
            <SetRow
              key={set.id}
              set={set}
              label={badgeFor(entry.sets, index)}
              record={recordsReachedBy(set, records).length > 0}
              previous={previousSets[index] ?? null}
              trackingType={entry.exercise.trackingType}
              editable={editable}
              onChange={handleChange}
              onToggleCompleted={handleToggleCompleted}
              onChangeType={handleChangeType}
              onDelete={handleDelete}
            />
          );
        });

        // Sets done one after another share an accent edge, so they read as one
        // block apart from the next set of the exercise.
        return chain.length > 1 ? (
          <View
            key={entry.sets[chain[0]].id}
            style={[styles.chain, { borderLeftColor: theme.accent }]}>
            {rows}
          </View>
        ) : (
          rows[0]
        );
      })}

      {editable ? (
        <View style={styles.addRow}>
          <Button
            title="Anadir serie"
            variant="secondary"
            style={styles.addSet}
            onPress={() => void addSet(entry.workoutExerciseId)}
          />
          <Pressable
            onPress={() => setAddSheetOpen(true)}
            accessibilityLabel="Anadir drop set o serie 3/7"
            style={({ pressed }) => [
              styles.addMore,
              { backgroundColor: theme.backgroundElement },
              pressed && { opacity: 0.6 },
            ]}>
            <Ionicons name="chevron-up" size={20} color={theme.text} />
          </Pressable>
        </View>
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
    before.onReorder !== after.onReorder ||
    before.closesGroup !== after.closesGroup ||
    before.canLink !== after.canLink ||
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
      set.restSeconds === other.restSeconds &&
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
  inGroup: { marginBottom: 4 },
  superset: { paddingHorizontal: 12, paddingBottom: 2 },
  rest: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingTop: 6 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 12 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerText: { flex: 1, gap: 2 },
  title: { fontWeight: '700' },
  chain: { marginLeft: 8, borderLeftWidth: 3, borderRadius: 2 },
  addRow: { flexDirection: 'row', gap: 8, marginHorizontal: 12, marginTop: 8 },
  addSet: { flex: 1, paddingVertical: 10 },
  addMore: { width: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
