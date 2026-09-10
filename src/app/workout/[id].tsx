import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/screen-header';
import { TextPrompt } from '@/components/text-prompt';
import { ThemedText } from '@/components/themed-text';
import { DatePrompt } from '@/features/calendar/date-prompt';
import { ExerciseCard } from '@/features/workout/components/exercise-card';
import { rescheduleWorkout, updateWorkout } from '@/features/workout/mutations';
import { useWorkoutContents } from '@/features/workout/queries';
import { completedSetCount, totalVolume } from '@/features/workout/volume';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatDuration, formatNumber, formatTime } from '@/lib/format';

/**
 * A finished session. Read-only by default; `edit=1` opens it for correcting
 * what was logged, which is how the history list's Editar action arrives.
 *
 * Editing changes the session only. Records already earned are left alone: they
 * are a high-water mark, and lowering one because a set was corrected would
 * quietly rewrite a personal best.
 */
export default function WorkoutDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const { contents, loading } = useWorkoutContents(id);

  const [editing, setEditing] = useState(edit === '1');
  const [renaming, setRenaming] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  if (!contents) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ThemedText type="default" themeColor="textSecondary">
          {loading ? 'Cargando...' : 'Este entreno ya no existe.'}
        </ThemedText>
      </View>
    );
  }

  const { workout, entries } = contents;
  const allSets = entries.flatMap((entry) => entry.sets);
  const duration = workout.finishedAt === null ? null : workout.finishedAt - workout.startedAt;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={workout.name}
        subtitle={`${formatDay(workout.startedAt)} · ${formatTime(workout.startedAt)}`}
        right={
          <Pressable onPress={() => setEditing(!editing)} hitSlop={8}>
            <ThemedText type="default" style={{ color: theme.accentText, fontWeight: '700' }}>
              {editing ? 'Hecho' : 'Editar'}
            </ThemedText>
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.stats, { borderColor: theme.border }]}>
          <Stat label="Duracion" value={duration === null ? '-' : formatDuration(duration)} />
          <Stat label="Volumen" value={`${formatNumber(totalVolume(allSets), 0)} kg`} />
          <Stat label="Series" value={String(completedSetCount(allSets))} />
        </View>

        {entries.map((entry) => (
          <ExerciseCard
            key={entry.workoutExerciseId}
            entry={entry}
            workoutId={workout.id}
            editable={editing}
          />
        ))}

        {editing ? (
          <View style={styles.actions}>
            <Button
              title="Anadir ejercicio"
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: '/pick-exercise',
                  params: { target: 'workout', id: workout.id },
                })
              }
            />
            <Button title="Renombrar entreno" variant="secondary" onPress={() => setRenaming(true)} />
            <Button
              title="Cambiar fecha"
              variant="secondary"
              onPress={() => setRescheduling(true)}
            />
          </View>
        ) : null}
      </ScrollView>

      {renaming ? (
        <TextPrompt
          title="Renombrar entreno"
          initialValue={workout.name}
          confirmLabel="Guardar"
          onCancel={() => setRenaming(false)}
          onSubmit={(name) => {
            setRenaming(false);
            void updateWorkout(workout.id, { name });
          }}
        />
      ) : null}

      {rescheduling ? (
        <DatePrompt
          title="Cambiar fecha"
          initialValue={workout.startedAt}
          onCancel={() => setRescheduling(false)}
          onSubmit={(startedAt) => {
            setRescheduling(false);
            void rescheduleWorkout(workout.id, startedAt);
          }}
        />
      ) : null}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="default" style={{ fontWeight: '700' }}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  screen: { flex: 1 },
  content: { paddingVertical: 12, paddingBottom: 48 },
  stats: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  actions: { paddingHorizontal: 12, gap: 8 },
});
