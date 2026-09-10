import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { useConfirm } from '@/components/confirm-dialog';
import { OptionSheet, type SheetOption } from '@/components/option-sheet';
import { ScreenHeader } from '@/components/screen-header';
import { TextPrompt } from '@/components/text-prompt';
import { ThemedText } from '@/components/themed-text';
import { exerciseMediaUrl } from '@/features/exercises/media';
import {
  linkWithNext,
  moveRoutineExercise,
  removeRoutineExercise,
  unlinkSuperset,
  updateRoutine,
  updateRoutineExercise,
} from '@/features/routines/mutations';
import { useRoutineContents, type RoutineEntry } from '@/features/routines/queries';
import { RestSheet, formatRest } from '@/features/workout/components/rest-sheet';
import { startWorkoutFromRoutine } from '@/features/workout/mutations';
import { useActiveWorkout } from '@/features/workout/queries';
import { useTheme } from '@/hooks/use-theme';

const SET_COUNT_OPTIONS: SheetOption<number>[] = [1, 2, 3, 4, 5, 6, 8, 10].map((value) => ({
  value,
  label: `${value} series`,
}));

export default function RoutineEditorScreen() {
  const theme = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { contents, loading } = useRoutineContents(id);
  const { contents: active } = useActiveWorkout();
  const [renaming, setRenaming] = useState(false);

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
            <ThemedText type="default" style={{ color: theme.accent, fontWeight: '700' }}>
              Renombrar
            </ThemedText>
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>

      {entries.map((entry, index) => (
        <RoutineExerciseCard
          key={entry.routineExerciseId}
          entry={entry}
          isFirst={index === 0}
          isLast={index === entries.length - 1}
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
    </View>
  );
}

function RoutineExerciseCard({
  entry,
  isFirst,
  isLast,
  canLink,
}: {
  entry: RoutineEntry;
  isFirst: boolean;
  isLast: boolean;
  canLink: boolean;
}) {
  const theme = useTheme();
  const confirm = useConfirm();
  const [sheet, setSheet] = useState<'sets' | 'rest' | null>(null);
  const [reps, setReps] = useState(entry.targetReps ?? '');

  async function remove() {
    const accepted = await confirm({
      title: 'Quitar ejercicio',
      message: `Se quita "${entry.exercise.name}" de la rutina.`,
      confirmLabel: 'Quitar',
      destructive: true,
    });

    if (accepted) await removeRoutineExercise(entry.routineExerciseId);
  }

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.background, borderColor: theme.border },
        entry.supersetGroup !== null && { borderLeftWidth: 3, borderLeftColor: theme.accent },
      ]}>
      {entry.supersetGroup !== null ? (
        <ThemedText type="smallBold" style={[styles.superset, { color: theme.accent }]}>
          SUPERSERIE {String.fromCharCode(64 + entry.supersetGroup)}
        </ThemedText>
      ) : null}

      <View style={styles.cardHeader}>
        <Image
          source={exerciseMediaUrl(entry.exercise.imagePath)}
          recyclingKey={entry.exercise.id}
          cachePolicy="memory-disk"
          style={[styles.thumbnail, { backgroundColor: theme.backgroundElement }]}
          contentFit="cover"
        />

        <View style={styles.cardHeaderText}>
          <ThemedText type="default" style={styles.cardTitle}>
            {entry.exercise.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {entry.exercise.muscleGroup} · {entry.exercise.equipment}
          </ThemedText>
        </View>

        <Pressable onPress={() => void remove()} hitSlop={8} accessibilityLabel="Quitar ejercicio">
          <Ionicons name="trash-outline" size={20} color={theme.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.fields}>
        <Pressable
          onPress={() => setSheet('sets')}
          style={[styles.field, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small" themeColor="textSecondary">
            SERIES
          </ThemedText>
          <ThemedText type="default">{entry.targetSets ?? 3}</ThemedText>
        </Pressable>

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

      <View style={styles.tools}>
        <Tool
          icon="arrow-up"
          label="Subir"
          disabled={isFirst}
          onPress={() => void moveRoutineExercise(entry.routineExerciseId, 'up')}
        />
        <Tool
          icon="arrow-down"
          label="Bajar"
          disabled={isLast}
          onPress={() => void moveRoutineExercise(entry.routineExerciseId, 'down')}
        />
        {entry.supersetGroup === null ? (
          <Tool
            icon="link"
            label="Unir con el siguiente"
            disabled={!canLink}
            onPress={() => void linkWithNext(entry.routineExerciseId)}
          />
        ) : (
          <Tool
            icon="unlink"
            label="Separar"
            onPress={() => void unlinkSuperset(entry.routineExerciseId)}
          />
        )}
      </View>

      {sheet === 'sets' ? (
        <OptionSheet
          title="Series objetivo"
          options={SET_COUNT_OPTIONS}
          current={entry.targetSets ?? 3}
          onSelect={(value) => {
            setSheet(null);
            void updateRoutineExercise(entry.routineExerciseId, { targetSets: value });
          }}
          onClose={() => setSheet(null)}
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

function Tool({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.tool,
        { backgroundColor: theme.backgroundElement },
        (pressed || disabled) && { opacity: 0.4 },
      ]}>
      <Ionicons name={icon} size={16} color={theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  screen: { flex: 1 },
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
  thumbnail: { width: 44, height: 44, borderRadius: 8 },
  fields: { flexDirection: 'row', gap: 8, paddingHorizontal: 12 },
  field: { flex: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, gap: 2 },
  repsInput: { fontSize: 16, fontWeight: '500', padding: 0 },
  tools: { flexDirection: 'row', gap: 8, paddingHorizontal: 12 },
  tool: { width: 40, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actions: { paddingHorizontal: 12, gap: 8 },
  empty: { textAlign: 'center', paddingHorizontal: 32, paddingBottom: 16 },
});
