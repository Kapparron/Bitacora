import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { useConfirm } from '@/components/confirm-dialog';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration, formatNumber } from '@/lib/format';
import { ReorderSheet } from '@/features/exercises/components/reorder-sheet';
import { BodyMap, useBodyLoad } from '@/features/workout/components/body-map';
import { ExerciseCard } from '@/features/workout/components/exercise-card';
import { RestTimerBar } from '@/features/workout/components/rest-timer-bar';
import { discardWorkout, finishWorkout, reorderWorkoutExercises } from '@/features/workout/mutations';
import { useActiveWorkout } from '@/features/workout/queries';
import { useRestTimer } from '@/features/workout/rest-timer';
import { useElapsed } from '@/features/workout/use-elapsed';
import { completedSetCount, totalVolume } from '@/features/workout/volume';

export default function ActiveWorkoutScreen() {
  const theme = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const stopRest = useRestTimer((state) => state.stop);
  const { contents, loading } = useActiveWorkout();
  const elapsed = useElapsed(contents?.workout.startedAt ?? null);
  const [reordering, setReordering] = useState(false);
  // Stable, so opening the sheet does not re-render every memoised card.
  const openReorder = useCallback(() => setReordering(true), []);
  const body = useBodyLoad(contents?.entries ?? NO_ENTRIES);

  // The session can disappear from under this screen (finished or discarded), in
  // which case there is nothing left to render and going back is the only move.
  if (!contents) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ThemedText type="default" themeColor="textSecondary">
          {loading ? 'Cargando...' : 'No hay ningun entreno en curso.'}
        </ThemedText>
        {loading ? null : <Button title="Volver" variant="secondary" onPress={() => router.back()} />}
      </View>
    );
  }

  const { workout, entries } = contents;
  const allSets = entries.flatMap((entry) => entry.sets);
  const volume = totalVolume(allSets);
  const done = completedSetCount(allSets);

  async function confirmFinish() {
    const pending = allSets.length - done;
    const accepted = await confirm({
      title: 'Terminar entreno',
      message:
        pending > 0
          ? `Se guardan ${done} series. Las ${pending} sin marcar se descartan.`
          : `Se guardan ${done} series.`,
      confirmLabel: 'Terminar',
    });

    if (!accepted) return;

    const result = await finishWorkout(workout.id);
    stopRest();

    if (result.status === 'discarded') {
      router.replace('/');
      await confirm({
        title: 'Entreno descartado',
        message: 'No habia ninguna serie marcada como completada.',
        confirmLabel: 'Entendido',
        cancelLabel: null,
      });
      return;
    }

    // The summary is the session's own detail screen, so it can be reopened
    // from the history later.
    router.replace({ pathname: '/workout/[id]', params: { id: workout.id, finished: '1' } });
  }

  async function confirmDiscard() {
    const accepted = await confirm({
      title: 'Descartar entreno',
      message: 'Se pierde todo lo registrado en esta sesion.',
      confirmLabel: 'Descartar',
    });

    if (!accepted) return;

    await discardWorkout(workout.id);
    stopRest();
    router.replace('/');
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader
        title={workout.name}
        right={
          <Pressable onPress={() => void confirmFinish()} hitSlop={8}>
            <ThemedText type="default" style={{ color: theme.accentText, fontWeight: '700' }}>
              Terminar
            </ThemedText>
          </Pressable>
        }
      />

      {/* Outside the ScrollView so the countdown and its actions stay reachable
          while scrolling down to the next exercise. */}
      <RestTimerBar />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.stats, { borderColor: theme.border }]}>
          <View style={styles.figures}>
            <Stat label="Duracion" value={formatDuration(elapsed)} />
            <Stat label="Volumen" value={`${formatNumber(volume, 0)} kg`} />
            <Stat label="Series" value={String(done)} />
          </View>
          {/* Fills in as sets are ticked off. */}
          <BodyMap load={body} scale={BODY_SCALE} />
        </View>

        {entries.map((entry) => (
          <ExerciseCard
            key={entry.workoutExerciseId}
            entry={entry}
            workoutId={workout.id}
            editable
            onReorder={entries.length > 1 ? openReorder : undefined}
          />
        ))}

        {entries.length === 0 ? (
          <ThemedText type="default" themeColor="textSecondary" style={styles.empty}>
            Anade el primer ejercicio para empezar a registrar series.
          </ThemedText>
        ) : null}

        <View style={styles.actions}>
          <Button
            title="Anadir ejercicio"
            onPress={() =>
              router.push({
                pathname: '/pick-exercise',
                params: { target: 'workout', id: workout.id },
              })
            }
          />
          <Button title="Descartar entreno" variant="danger" onPress={() => void confirmDiscard()} />
        </View>
      </ScrollView>

      {reordering ? (
        <ReorderSheet
          items={entries.map((entry) => ({
            id: entry.workoutExerciseId,
            supersetGroup: entry.supersetGroup,
            exercise: entry.exercise,
          }))}
          onReorder={(orderedIds) => void reorderWorkoutExercises(workout.id, orderedIds)}
          onClose={() => setReordering(false)}
        />
      ) : null}
    </KeyboardAvoidingView>
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

const NO_ENTRIES: never[] = [];

/** Small enough to sit under the figures: 60 × 120 points per side. */
const BODY_SCALE = 0.3;

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  content: { paddingVertical: 12, paddingBottom: 48 },
  stats: {
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  figures: { flexDirection: 'row' },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  actions: { paddingHorizontal: 12, gap: 8 },
  empty: { textAlign: 'center', paddingHorizontal: 32, paddingBottom: 16 },
});
