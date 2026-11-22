import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { useConfirm } from '@/components/confirm-dialog';
import { OptionSheet } from '@/components/option-sheet';
import { ScreenHeader } from '@/components/screen-header';
import { TextPrompt } from '@/components/text-prompt';
import { ThemedText } from '@/components/themed-text';
import {
  MAX_PLAN,
  formatPlan,
  movePlan,
  summaryOfPlan,
  type PlanKind,
} from '@/features/routines/plan';
import { ExerciseThumbnail } from '@/features/exercises/components/exercise-thumbnail';
import { ReorderSheet } from '@/features/exercises/components/reorder-sheet';
import {
  linkWithNext,
  removeRoutineExercise,
  reorderRoutineExercises,
  unlinkSuperset,
  updateRoutine,
  updateRoutineExercise,
} from '@/features/routines/mutations';
import { ScheduleEditor } from '@/features/routines/components/schedule-editor';
import { useRoutineContents, type RoutineEntry } from '@/features/routines/queries';
import { describeSchedule, scheduleOf } from '@/features/routines/schedule';
import { RestSheet } from '@/features/workout/components/rest-sheet';
import { startWorkoutFromRoutine } from '@/features/workout/mutations';
import { useActiveWorkout } from '@/features/workout/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatRest } from '@/lib/format';

type ChipAction = PlanKind | 'left' | 'right' | 'delete';

const KIND_LABEL: Record<PlanKind, string> = {
  normal: 'Serie',
  drop: 'Drop',
  three_seven: '3/7',
};

/** What a plan entry shows: the number of a normal set, or the letter of its kind. */
function chipLabel(plan: readonly PlanKind[], index: number): string {
  if (plan[index] === 'drop') return 'D';
  if (plan[index] === 'three_seven') return '3/7';

  return String(plan.slice(0, index + 1).filter((kind) => kind === 'normal').length);
}

export default function RoutineEditorScreen() {
  const theme = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { contents, loading } = useRoutineContents(id);
  const { contents: active } = useActiveWorkout();
  const [renaming, setRenaming] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [reordering, setReordering] = useState(false);

  if (!contents) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ThemedText type="default" themeColor="textSecondary">
          {loading ? 'Cargando...' : 'Esta rutina ya no existe.'}
        </ThemedText>
      </View>
    );
  }

  const { routine, entries } = contents;

  async function start() {
    if (active) {
      const accepted = await confirm({
        title: 'Ya hay un entreno en curso',
        message: 'Termina o descarta el entreno actual antes de empezar esta rutina.',
        confirmLabel: 'Ir al entreno',
      });

      if (accepted) router.navigate('/workout/active');
      return;
    }

    await startWorkoutFromRoutine(routine.id);
    router.navigate('/workout/active');
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={routine.name}
        subtitle={entries.length === 1 ? '1 ejercicio' : `${entries.length} ejercicios`}
        right={
          <Pressable onPress={() => setRenaming(true)} hitSlop={8}>
            <ThemedText type="default" style={{ color: theme.accentText, fontWeight: '700' }}>
              Renombrar
            </ThemedText>
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>

      <Pressable
        onPress={() => setEditingSchedule(true)}
        style={({ pressed }) => [
          styles.schedule,
          { borderColor: theme.border },
          pressed && { backgroundColor: theme.backgroundElement },
        ]}>
        <Ionicons name="calendar-outline" size={20} color={theme.accentText} />
        <View style={styles.scheduleText}>
          <ThemedText type="small" themeColor="textSecondary">
            CUANDO TOCA
          </ThemedText>
          <ThemedText type="default">{describeSchedule(scheduleOf(routine))}</ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
      </Pressable>

      {entries.map((entry, index) => (
        <RoutineExerciseCard
          key={entry.routineExerciseId}
          entry={entry}
          onReorder={entries.length > 1 ? () => setReordering(true) : undefined}
          canLink={index < entries.length - 1}
        />
      ))}

      {entries.length === 0 ? (
        <ThemedText type="default" themeColor="textSecondary" style={styles.empty}>
          Anade los ejercicios que forman esta rutina. Al empezarla se crean sus series vacias.
        </ThemedText>
      ) : null}

      <View style={styles.actions}>
        <Button
          title="Anadir ejercicio"
          variant="secondary"
          onPress={() =>
            router.push({ pathname: '/pick-exercise', params: { target: 'routine', id: routine.id } })
          }
        />
        <Button
          title="Empezar esta rutina"
          disabled={entries.length === 0}
          onPress={() => void start()}
        />
        <Button
          title="Compartir rutina"
          variant="ghost"
          disabled={entries.length === 0}
          onPress={() => router.push({ pathname: '/routine/share', params: { id: routine.id } })}
        />
      </View>

      </ScrollView>

      {renaming ? (
        <TextPrompt
          title="Renombrar rutina"
          initialValue={routine.name}
          confirmLabel="Guardar"
          onCancel={() => setRenaming(false)}
          onSubmit={(name) => {
            setRenaming(false);
            void updateRoutine(routine.id, { name });
          }}
        />
      ) : null}

      {reordering ? (
        <ReorderSheet
          items={entries.map((entry) => ({
            id: entry.routineExerciseId,
            supersetGroup: entry.supersetGroup,
            exercise: entry.exercise,
          }))}
          onReorder={(orderedIds) => void reorderRoutineExercises(routine.id, orderedIds)}
          onClose={() => setReordering(false)}
        />
      ) : null}

      {editingSchedule ? (
        <ScheduleEditor
          schedule={scheduleOf(routine)}
          onClose={() => setEditingSchedule(false)}
          onSave={(schedule) => {
            setEditingSchedule(false);
            void updateRoutine(routine.id, {
              scheduleType: schedule.type,
              scheduleWeekdays: schedule.type === 'weekdays' ? schedule.weekdays : null,
              scheduleIntervalDays: schedule.type === 'interval' ? schedule.everyDays : null,
              scheduleAnchor: schedule.type === 'interval' ? schedule.anchor : null,
            });
          }}
        />
      ) : null}
    </View>
  );
}

function RoutineExerciseCard({
  entry,
  onReorder,
  canLink,
}: {
  entry: RoutineEntry;
  /** Opens the reorder sheet. Left out when there is nothing to reorder. */
  onReorder?: () => void;
  canLink: boolean;
}) {
  const theme = useTheme();
  const confirm = useConfirm();
  const [sheet, setSheet] = useState<'rest' | null>(null);
  /** Index of the plan entry whose menu is open. */
  const [editing, setEditing] = useState<number | null>(null);
  const [reps, setReps] = useState(entry.targetReps ?? '');

  async function remove() {
    const accepted = await confirm({
      title: 'Quitar ejercicio',
      message: `Se quita "${entry.exercise.name}" de la rutina.`,
      confirmLabel: 'Quitar',
    });

    if (accepted) await removeRoutineExercise(entry.routineExerciseId);
  }

  function savePlan(plan: readonly PlanKind[]) {
    void updateRoutineExercise(entry.routineExerciseId, { plan: formatPlan(plan) });
  }

  function addToPlan(kind: PlanKind) {
    if (entry.plan.length < MAX_PLAN) savePlan([...entry.plan, kind]);
  }

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.background, borderColor: theme.border },
        entry.supersetGroup !== null && { borderLeftWidth: 3, borderLeftColor: theme.accent },
      ]}>
      {entry.supersetGroup !== null ? (
        <ThemedText type="smallBold" style={[styles.superset, { color: theme.accentText }]}>
          SUPERSERIE {String.fromCharCode(64 + entry.supersetGroup)}
        </ThemedText>
      ) : null}

      <View style={styles.cardHeader}>
        <ExerciseThumbnail exercise={entry.exercise} />

        <View style={styles.cardHeaderText}>
          <ThemedText type="default" style={styles.cardTitle}>
            {entry.exercise.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {entry.exercise.muscleGroup} · {entry.exercise.equipment}
          </ThemedText>
        </View>

        {onReorder ? (
          <Pressable onPress={onReorder} hitSlop={8} accessibilityLabel="Reordenar ejercicios">
            <Ionicons name="reorder-three" size={22} color={theme.textSecondary} />
          </Pressable>
        ) : null}

        {entry.supersetGroup !== null || canLink ? (
          <Pressable
            onPress={() =>
              void (entry.supersetGroup !== null
                ? unlinkSuperset(entry.routineExerciseId)
                : linkWithNext(entry.routineExerciseId))
            }
            hitSlop={8}
            accessibilityLabel={
              entry.supersetGroup !== null ? 'Separar de la superserie' : 'Superserie con el siguiente'
            }>
            <Ionicons
              name={entry.supersetGroup !== null ? 'unlink' : 'link'}
              size={20}
              color={entry.supersetGroup !== null ? theme.accentText : theme.textSecondary}
            />
          </Pressable>
        ) : null}

        <Pressable onPress={() => void remove()} hitSlop={8} accessibilityLabel="Quitar ejercicio">
          <Ionicons name="trash-outline" size={20} color={theme.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.fields}>
        <View style={[styles.field, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small" themeColor="textSecondary">
            REPS
          </ThemedText>
          <TextInput
            value={reps}
            onChangeText={setReps}
            onBlur={() =>
              void updateRoutineExercise(entry.routineExerciseId, {
                targetReps: reps.trim() || null,
              })
            }
            placeholder="8-12"
            placeholderTextColor={theme.textSecondary}
            style={[styles.repsInput, { color: theme.text }]}
          />
        </View>

        <Pressable
          onPress={() => setSheet('rest')}
          style={[styles.field, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small" themeColor="textSecondary">
            DESCANSO
          </ThemedText>
          <ThemedText type="default">{formatRest(entry.restSeconds)}</ThemedText>
        </Pressable>
      </View>

      <View style={styles.plan}>
        <ThemedText type="small" themeColor="textSecondary">
          {summaryOfPlan(entry.plan)}
        </ThemedText>

        <View style={styles.chips}>
          {entry.plan.map((kind, index) => (
            <Pressable
              key={`${index}-${kind}`}
              onPress={() => setEditing(index)}
              accessibilityLabel={`${KIND_LABEL[kind]} ${chipLabel(entry.plan, index)}`}
              style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText
                type="smallBold"
                style={{ color: kind === 'normal' ? theme.text : theme.accentText }}>
                {chipLabel(entry.plan, index)}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <View style={styles.addRow}>
          {(['normal', 'drop', 'three_seven'] as const).map((kind) => (
            <Pressable
              key={kind}
              onPress={() => addToPlan(kind)}
              accessibilityLabel={`Anadir ${KIND_LABEL[kind]}`}
              style={[styles.addButton, { backgroundColor: theme.backgroundElement }]}>
              <Ionicons name="add" size={14} color={theme.text} />
              <ThemedText type="small">{KIND_LABEL[kind]}</ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      {editing !== null && editing < entry.plan.length ? (
        <OptionSheet<ChipAction | null>
          title={`${KIND_LABEL[entry.plan[editing]]} ${chipLabel(entry.plan, editing)}`}
          options={[
            ...(['normal', 'drop', 'three_seven'] as const)
              .filter((kind) => kind !== entry.plan[editing])
              .map((kind) => ({ value: kind, label: `Cambiar a ${KIND_LABEL[kind].toLowerCase()}` })),
            ...(editing > 0 ? [{ value: 'left' as const, label: 'Mover a la izquierda' }] : []),
            ...(editing < entry.plan.length - 1
              ? [{ value: 'right' as const, label: 'Mover a la derecha' }]
              : []),
            { value: 'delete' as const, label: 'Borrar' },
          ]}
          current={null}
          onSelect={(action) => {
            const index = editing;
            setEditing(null);
            if (action === null) return;

            if (action === 'left') savePlan(movePlan(entry.plan, index, -1));
            else if (action === 'right') savePlan(movePlan(entry.plan, index, 1));
            else if (action === 'delete') savePlan(entry.plan.filter((_, other) => other !== index));
            else savePlan(entry.plan.map((kind, other) => (other === index ? action : kind)));
          }}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {sheet === 'rest' ? (
        <RestSheet
          current={entry.restSeconds}
          onSelect={(seconds) => {
            setSheet(null);
            void updateRoutineExercise(entry.routineExerciseId, { restSeconds: seconds });
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  screen: { flex: 1 },
  schedule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  scheduleText: { flex: 1, gap: 2 },
  content: { paddingVertical: 12, paddingBottom: 48 },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginBottom: 12,
    gap: 10,
  },
  superset: { paddingHorizontal: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12 },
  cardHeaderText: { flex: 1, gap: 2 },
  cardTitle: { fontWeight: '700' },
  fields: { flexDirection: 'row', gap: 8, paddingHorizontal: 12 },
  field: { flex: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, gap: 2 },
  repsInput: { fontSize: 16, fontWeight: '500', padding: 0 },
  plan: { gap: 8, paddingHorizontal: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    minWidth: 40,
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  addRow: { flexDirection: 'row', gap: 8 },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 8,
    paddingVertical: 8,
  },
  actions: { paddingHorizontal: 12, gap: 8 },
  empty: { textAlign: 'center', paddingHorizontal: 32, paddingBottom: 16 },
});
