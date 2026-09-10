import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import {
  useHistorySessions,
  type HistoryExercise,
  type HistorySession,
} from '@/features/workout/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatDuration, formatNumber, formatTime } from '@/lib/format';

/** One set as it is read back: `60 kg × 10`, or whatever half of it was logged. */
function describeSet(set: HistoryExercise['sets'][number]): string {
  const weight = set.weight === null ? null : `${formatNumber(set.weight)} kg`;
  const reps = set.reps === null ? null : `${set.reps}`;

  if (weight && reps) return `${weight} × ${reps}`;
  return weight ?? (reps ? `× ${reps}` : '-');
}

/**
 * Routines and exercises live one tap away; the page itself is the training log,
 * session by session, with the sets that were performed.
 */
export default function RoutinesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { sessions, loading } = useHistorySessions();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerActions}>
              <Button
                title="Rutinas"
                style={styles.headerButton}
                onPress={() => router.push('/routine')}
              />
              <Button
                title="Ejercicios"
                variant="secondary"
                style={styles.headerButton}
                onPress={() => router.push('/exercises')}
              />
            </View>

            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
              HISTORIAL
            </ThemedText>
          </View>
        }
        renderItem={({ item }) => (
          <SessionCard session={item} onPress={() => router.push(`/workout/${item.id}`)} />
        )}
        ListEmptyComponent={
          <ThemedText type="default" themeColor="textSecondary" style={styles.empty}>
            {loading ? 'Cargando...' : 'Todavia no has terminado ningun entreno.'}
          </ThemedText>
        }
      />
    </SafeAreaView>
  );
}

function SessionCard({ session, onPress }: { session: HistorySession; onPress: () => void }) {
  const theme = useTheme();
  const duration =
    session.finishedAt === null ? null : formatDuration(session.finishedAt - session.startedAt);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderColor: theme.border },
        pressed && { backgroundColor: theme.backgroundElement },
      ]}>
      <ThemedText type="default" style={styles.cardTitle}>
        {session.name}
      </ThemedText>

      <ThemedText type="small" themeColor="textSecondary">
        {formatDay(session.startedAt)} · {formatTime(session.startedAt)}
        {duration ? ` · ${duration}` : ''} · {formatNumber(session.volume, 0)} kg
      </ThemedText>

      {session.exercises.map((exercise, index) => (
        <View key={index} style={styles.exercise}>
          <ThemedText type="small" style={styles.exerciseName} numberOfLines={1}>
            {exercise.name}
          </ThemedText>

          <ThemedText type="small" themeColor="textSecondary" style={styles.sets}>
            {exercise.sets.length === 0
              ? 'sin series'
              : exercise.sets.map(describeSet).join('  ·  ')}
          </ThemedText>
        </View>
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingBottom: 120 },
  header: { paddingHorizontal: 12, paddingTop: 8, gap: 12 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerButton: { flex: 1 },
  sectionTitle: { paddingHorizontal: 2 },
  card: {
    marginHorizontal: 12,
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  cardTitle: { fontWeight: '700' },
  exercise: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingTop: 4 },
  exerciseName: { flex: 1, fontWeight: '600' },
  sets: { flex: 1.4, textAlign: 'right' },
  empty: { textAlign: 'center', paddingHorizontal: 32, paddingTop: 24 },
});
