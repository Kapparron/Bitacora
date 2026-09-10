import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { MonthCalendar } from '@/features/calendar/month-calendar';
import { startEmptyWorkout } from '@/features/workout/mutations';
import {
  useActiveWorkout,
  useWorkoutHistory,
  type WorkoutSummary,
} from '@/features/workout/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatDuration, formatNumber, formatTime, toIsoDay } from '@/lib/format';

export default function WorkoutScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { contents: active } = useActiveWorkout();
  const { workouts } = useWorkoutHistory();

  const [starting, setStarting] = useState(false);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  /**
   * Sessions grouped by the local day they started on. The calendar marks those
   * days, and picking one filters the list below it. Nutrition will mark the
   * same grid once the diary exists.
   */
  const byDay = useMemo(() => {
    const map = new Map<string, WorkoutSummary[]>();

    for (const workout of workouts) {
      const day = toIsoDay(new Date(workout.startedAt));
      const current = map.get(day);
      if (current) current.push(workout);
      else map.set(day, [workout]);
    }

    return map;
  }, [workouts]);

  const markedDays = useMemo(() => new Set(byDay.keys()), [byDay]);
  const listed = selectedDay ? (byDay.get(selectedDay) ?? []) : workouts;

  async function start() {
    if (starting) return;
    setStarting(true);

    try {
      await startEmptyWorkout();
      router.navigate('/workout/active');
    } finally {
      setStarting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <FlatList
        data={listed}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <MonthCalendar
              month={month}
              onMonthChange={setMonth}
              markedDays={markedDays}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
            />

            <View style={styles.actions}>
              <Button
                title={active ? 'Volver al entreno en curso' : 'Empezar entreno vacio'}
                // navigate, not push: the session is a single destination, so a
                // second tap must return to the open screen instead of stacking a
                // duplicate of it.
                onPress={active ? () => router.navigate('/workout/active') : () => void start()}
                disabled={starting}
              />
            </View>

            <View style={styles.sectionTitle}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {selectedDay
                  ? formatDay(new Date(`${selectedDay}T12:00:00`).getTime()).toUpperCase()
                  : 'HISTORIAL'}
              </ThemedText>

              {selectedDay ? (
                <Pressable onPress={() => setSelectedDay(null)} hitSlop={8}>
                  <ThemedText type="small" style={{ color: theme.accent, fontWeight: '700' }}>
                    Ver todo
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <HistoryRow summary={item} onPress={() => router.push(`/workout/${item.id}`)} />
        )}
        ListEmptyComponent={
          <ThemedText type="default" themeColor="textSecondary" style={styles.empty}>
            {selectedDay
              ? 'Ese dia no se entreno.'
              : 'Todavia no hay entrenos. El primero que registres aparece aqui.'}
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
  header: { paddingTop: 8, gap: 12 },
  actions: { paddingHorizontal: 12 },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
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
