import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { useConfirm } from '@/components/confirm-dialog';
import { ScreenHeader } from '@/components/screen-header';
import { TextPrompt } from '@/components/text-prompt';
import { ThemedText } from '@/components/themed-text';
import { createRoutine, deleteRoutine } from '@/features/routines/mutations';
import { useRoutines, type RoutineSummary } from '@/features/routines/queries';
import { describeSchedule, scheduleOf } from '@/features/routines/schedule';
import { startWorkoutFromRoutine } from '@/features/workout/mutations';
import { useActiveWorkout } from '@/features/workout/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatDay } from '@/lib/format';

/** The routines themselves: create one, open one, or start a session from it. */
export default function RoutineListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const { routines } = useRoutines();
  const { contents: active } = useActiveWorkout();
  const [naming, setNaming] = useState(false);

  async function start(routine: RoutineSummary) {
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

  async function remove(routine: RoutineSummary) {
    const accepted = await confirm({
      title: 'Borrar rutina',
      message: `Se borra "${routine.name}". Los entrenos ya registrados con ella se mantienen.`,
      confirmLabel: 'Borrar',
    });

    if (accepted) await deleteRoutine(routine.id);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Rutinas" />

      <FlatList
        data={routines}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerActions}>
            <Button title="Nueva rutina" onPress={() => setNaming(true)} />
          </View>
        }
        renderItem={({ item }) => (
          <RoutineRow
            routine={item}
            onOpen={() => router.push(`/routine/${item.id}`)}
            onStart={() => void start(item)}
            onDelete={() => void remove(item)}
          />
        )}
        ListEmptyComponent={
          <ThemedText type="default" themeColor="textSecondary" style={styles.empty}>
            Todavia no hay rutinas. Crea una para no tener que montar el entreno cada vez.
          </ThemedText>
        }
      />

      {naming ? (
        <TextPrompt
          title="Nueva rutina"
          placeholder="Torso, Pierna, Empuje..."
          confirmLabel="Crear"
          onCancel={() => setNaming(false)}
          onSubmit={async (name) => {
            setNaming(false);
            const id = await createRoutine(name);
            router.push(`/routine/${id}`);
          }}
        />
      ) : null}
    </View>
  );
}

function RoutineRow({
  routine,
  onOpen,
  onStart,
  onDelete,
}: {
  routine: RoutineSummary;
  onOpen: () => void;
  onStart: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onOpen}
      onLongPress={onDelete}
      style={({ pressed }) => [
        styles.row,
        { borderColor: theme.border },
        pressed && { backgroundColor: theme.backgroundElement },
      ]}>
      <View style={styles.rowText}>
        <ThemedText type="default" style={styles.rowTitle}>
          {routine.name}
        </ThemedText>

        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {routine.exerciseCount === 0
            ? 'Sin ejercicios todavia'
            : (routine.preview ?? `${routine.exerciseCount} ejercicios`)}
        </ThemedText>

        <ThemedText type="small" themeColor="textSecondary">
          {describeSchedule(scheduleOf(routine))}
          {routine.lastPerformedAt
            ? ` · ultima vez ${formatDay(routine.lastPerformedAt).toLowerCase()}`
            : ''}
        </ThemedText>
      </View>

      <Pressable
        onPress={onStart}
        disabled={routine.exerciseCount === 0}
        hitSlop={8}
        style={({ pressed }) => [
          styles.play,
          { backgroundColor: theme.accent },
          (pressed || routine.exerciseCount === 0) && { opacity: 0.4 },
        ]}>
        <Ionicons name="play" size={18} color={theme.onAccent} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingBottom: 120 },
  headerActions: { paddingHorizontal: 12, paddingTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 12,
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontWeight: '700' },
  play: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', paddingHorizontal: 32, paddingTop: 24 },
});
