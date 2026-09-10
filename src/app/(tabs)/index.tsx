import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatDuration, formatNumber, formatTime } from '@/lib/format';
import { startEmptyWorkout } from '@/features/workout/mutations';
import { useActiveWorkout, useWorkoutHistory, type WorkoutSummary } from '@/features/workout/queries';

export default function WorkoutScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { contents: active } = useActiveWorkout();
  const { workouts } = useWorkoutHistory();

  async function start() {
    await startEmptyWorkout();
    router.push('/workout/active');
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <ThemedText type="subtitle">Entreno</ThemedText>
            <Button
              title={active ? 'Volver al entreno en curso' : 'Empezar entreno vacio'}
              onPress={active ? () => router.push('/workout/active') : start}
            />
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
              HISTORIAL
            </ThemedText>
          </View>
        }
        renderItem={({ item }) => (
          <HistoryRow summary={item} onPress={() => router.push(`/workout/${item.id}`)} />
        )}
        ListEmptyComponent={
          <ThemedText type="default" themeColor="textSecondary" style={styles.empty}>
            Todavia no hay entrenos. El primero que registres aparece aqui.
          </ThemedText>
        }
      />
    </SafeAreaView>
  );
}

function HistoryRow({ summary, onPress }: { summary: WorkoutSummary; onPress: () => void }) {
  const theme = useTheme();
  const duration =
    summary.finishedAt === null ? null : formatDuration(summary.finishedAt - summary.startedAt);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderColor: theme.border },
        pressed && { backgroundColor: theme.backgroundElement },
      ]}>
      <ThemedText type="default" style={styles.rowTitle}>
        {summary.name}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {formatDay(summary.startedAt)} · {formatTime(summary.startedAt)}
        {duration ? ` · ${duration}` : ''}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {summary.exerciseCount} ejercicios · {summary.setCount} series ·{' '}
        {formatNumber(summary.volume, 0)} kg de volumen
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingBottom: 120 },
  header: { paddingHorizontal: 16, paddingTop: 8, gap: 16 },
  sectionTitle: { paddingTop: 8 },
  row: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  rowTitle: { fontWeight: '700' },
  empty: { textAlign: 'center', paddingHorizontal: 32, paddingTop: 24 },
});
