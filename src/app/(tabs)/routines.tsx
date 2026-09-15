import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ExerciseThumbnail } from '@/features/exercises/components/exercise-thumbnail';
import { badgeFor } from '@/features/workout/components/set-type-sheet';
import { WorkoutActionsSheet } from '@/features/workout/components/workout-actions-sheet';
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
  /** Session whose long-press menu is open. */
  const [menuSession, setMenuSession] = useState<HistorySession | null>(null);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <LinkRow icon="list-outline" title="Mis rutinas" onPress={() => router.push('/routine')} />
            <LinkRow
              icon="barbell-outline"
              title="Catálogo de ejercicios"
              onPress={() => router.push('/exercises')}
            />

            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
              HISTORIAL
            </ThemedText>
          </View>
        }
        renderItem={({ item }) => (
          <SessionCard
            session={item}
            onPress={() => router.push(`/workout/${item.id}`)}
            onLongPress={() => setMenuSession(item)}
          />
        )}
        ListEmptyComponent={
          <ThemedText type="default" themeColor="textSecondary" style={styles.empty}>
            {loading ? 'Cargando...' : 'Todavia no has terminado ningun entreno.'}
          </ThemedText>
        }
      />

      {menuSession ? (
        <WorkoutActionsSheet workout={menuSession} onClose={() => setMenuSession(null)} />
      ) : null}
    </SafeAreaView>
  );
}

/** Row that opens another screen: the chevron tells it apart from a tab. */
function LinkRow({
  icon,
  title,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.linkRow,
        { borderColor: theme.border },
        pressed && { backgroundColor: theme.backgroundElement },
      ]}>
      <Ionicons name={icon} size={20} color={theme.accentText} />
      <ThemedText type="default" style={styles.linkTitle}>
        {title}
      </ThemedText>
      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

function SessionCard({
  session,
  onPress,
  onLongPress,
}: {
  session: HistorySession;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const theme = useTheme();
  const duration =
    session.finishedAt === null ? null : formatDuration(session.finishedAt - session.startedAt);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
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
        <View key={index} style={[styles.exercise, { borderTopColor: theme.border }]}>
          <ExerciseThumbnail exercise={exercise.exercise} />

          <View style={styles.exerciseBody}>
            <ThemedText type="default" style={styles.exerciseName} numberOfLines={1}>
              {exercise.exercise.name}
            </ThemedText>

            {exercise.sets.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Sin series
              </ThemedText>
            ) : (
              exercise.sets.map((set, setIndex) => (
                <View key={setIndex} style={styles.setRow}>
                  {/* Same badge the session screen uses: a number, or the
                      letter of the set type. */}
                  <ThemedText type="small" themeColor="textSecondary" style={styles.setIndex}>
                    {badgeFor(exercise.sets, setIndex)}
                  </ThemedText>

                  <ThemedText type="small">{describeSet(set)}</ThemedText>
                </View>
              ))
            )}
          </View>
        </View>
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingBottom: 120 },
  header: { paddingHorizontal: 12, paddingTop: 8, gap: 8 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  linkTitle: { flex: 1 },
  sectionTitle: { paddingHorizontal: 2, paddingTop: 8 },
  card: {
    marginHorizontal: 12,
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  cardTitle: { fontWeight: '700' },
  exercise: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  exerciseBody: { flex: 1, gap: 2 },
  exerciseName: { fontWeight: '600' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  setIndex: { width: 14, textAlign: 'center' },
  empty: { textAlign: 'center', paddingHorizontal: 32, paddingTop: 24 },
});
