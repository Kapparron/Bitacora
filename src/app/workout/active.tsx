import { Stack, useRouter } from 'expo-router';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration, formatNumber } from '@/lib/format';
import { ExerciseCard } from '@/features/workout/components/exercise-card';
import { discardWorkout, finishWorkout } from '@/features/workout/mutations';
import { useActiveWorkout } from '@/features/workout/queries';
import { useElapsed } from '@/features/workout/use-elapsed';
import { completedSetCount, totalVolume } from '@/features/workout/volume';

export default function ActiveWorkoutScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { contents, loading } = useActiveWorkout();
  const elapsed = useElapsed(contents?.workout.startedAt ?? null);

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

  async function finish() {
    const result = await finishWorkout(workout.id);
    router.replace('/');

    if (result.status === 'discarded') {
      Alert.alert('Entreno descartado', 'No habia ninguna serie marcada como completada.');
    }
  }

  function confirmFinish() {
    const pending = allSets.length - done;
    const message =
      pending > 0
        ? `Se guardan ${done} series. Las ${pending} sin marcar se descartan.`
        : `Se guardan ${done} series.`;

    Alert.alert('Terminar entreno', message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Terminar', onPress: () => void finish() },
    ]);
  }

  function confirmDiscard() {
    Alert.alert('Descartar entreno', 'Se pierde todo lo registrado en esta sesion.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: async () => {
          await discardWorkout(workout.id);
          router.replace('/');
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: workout.name,
          headerRight: () => (
            <Pressable onPress={confirmFinish} hitSlop={8}>
              <ThemedText type="default" style={{ color: theme.accent, fontWeight: '700' }}>
                Terminar
              </ThemedText>
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.stats, { borderColor: theme.border }]}>
          <Stat label="Duracion" value={formatDuration(elapsed)} />
          <Stat label="Volumen" value={`${formatNumber(volume, 0)} kg`} />
          <Stat label="Series" value={String(done)} />
        </View>

        {entries.map((entry) => (
          <ExerciseCard
            key={entry.workoutExerciseId}
            entry={entry}
            workoutId={workout.id}
            editable
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
            onPress={() => router.push({ pathname: '/workout/pick-exercise', params: { workoutId: workout.id } })}
          />
          <Button title="Descartar entreno" variant="danger" onPress={confirmDiscard} />
        </View>
      </ScrollView>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
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
  empty: { textAlign: 'center', paddingHorizontal: 32, paddingBottom: 16 },
});
