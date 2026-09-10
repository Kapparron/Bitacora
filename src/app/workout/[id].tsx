import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ExerciseCard } from '@/features/workout/components/exercise-card';
import { useWorkoutContents } from '@/features/workout/queries';
import { completedSetCount, totalVolume } from '@/features/workout/volume';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatDuration, formatNumber, formatTime } from '@/lib/format';

/** Read-only view of a finished session. Editing past sessions comes in phase 4. */
export default function WorkoutDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { contents, loading } = useWorkoutContents(id);

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
          editable={false}
        />
      ))}
      </ScrollView>
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
});
