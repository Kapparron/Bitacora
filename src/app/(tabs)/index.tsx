import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { MonthCalendar } from '@/features/calendar/month-calendar';
import { useRoutines, type RoutineSummary } from '@/features/routines/queries';
import { useDailyKcal } from '@/features/nutrition/queries';
import { isScheduledOn, scheduleOf } from '@/features/routines/schedule';
import { startEmptyWorkout, startWorkoutFromRoutine } from '@/features/workout/mutations';
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
  const { routines } = useRoutines();
  const kcalByDay = useDailyKcal();

  const [starting, setStarting] = useState(false);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const today = toIsoDay();

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

  /**
   * Days of the shown month a routine falls on. Only the visible month is
   * computed: a schedule is a rule, so the days it produces are derived on
   * demand rather than stored.
   */
  const plannedDays = useMemo(() => {
    const days = new Set<string>();
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const schedules = routines.map(scheduleOf);

    for (let day = 1; day <= daysInMonth; day += 1) {
      const iso = toIsoDay(new Date(month.getFullYear(), month.getMonth(), day));
      if (schedules.some((schedule) => isScheduledOn(schedule, iso))) days.add(iso);
    }

    return days;
  }, [routines, month]);

  const scheduledFor = useMemo(
    () =>
      (day: string): RoutineSummary[] =>
        routines.filter((routine) => isScheduledOn(scheduleOf(routine), day)),
    [routines]
  );

  const todaysRoutines = useMemo(() => scheduledFor(today), [scheduledFor, today]);
  const listed = selectedDay ? (byDay.get(selectedDay) ?? []) : workouts;
  const plannedForSelected = selectedDay ? scheduledFor(selectedDay) : [];
  const kcalForSelected = selectedDay ? kcalByDay.get(selectedDay) : undefined;

  async function startEmpty() {
    if (starting) return;
    setStarting(true);

    try {
      await startEmptyWorkout();
      router.navigate('/workout/active');
    } finally {
      setStarting(false);
    }
  }

  async function startRoutine(routineId: string) {
    if (starting) return;
    setStarting(true);

    try {
      await startWorkoutFromRoutine(routineId);
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
              plannedDays={plannedDays}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
            />

            <View style={styles.actions}>
              {active ? (
                <Button
                  title="Volver al entreno en curso"
                  onPress={() => router.navigate('/workout/active')}
                />
              ) : (
                <>
                  {todaysRoutines.map((routine) => (
                    <Button
                      key={routine.id}
                      title={`Empezar ${routine.name}`}
                      disabled={starting || routine.exerciseCount === 0}
                      onPress={() => void startRoutine(routine.id)}
                    />
                  ))}

                  <Button
                    title="Empezar entreno vacio"
                    // Secondary once a routine is on today, so the planned one reads
                    // as the obvious choice.
                    variant={todaysRoutines.length > 0 ? 'secondary' : 'primary'}
                    disabled={starting}
                    onPress={() => void startEmpty()}
                  />
                </>
              )}
            </View>

            <View style={styles.sectionTitle}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {selectedDay
                  ? formatDay(new Date(`${selectedDay}T12:00:00`).getTime()).toUpperCase()
                  : 'HISTORIAL'}
              </ThemedText>

              {selectedDay ? (
                <Pressable onPress={() => setSelectedDay(null)} hitSlop={8}>
                  <ThemedText type="small" style={{ color: theme.accentText, fontWeight: '700' }}>
                    Ver todo
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>

            {kcalForSelected !== undefined ? (
              <Pressable
                onPress={() => router.navigate('/nutrition')}
                style={({ pressed }) => [
                  styles.planned,
                  { borderColor: theme.border, borderStyle: 'solid' },
                  pressed && { backgroundColor: theme.backgroundElement },
                ]}>
                <Ionicons name="restaurant-outline" size={18} color={theme.accentText} />
                <ThemedText type="small" style={styles.plannedText}>
                  {formatNumber(kcalForSelected, 0)} kcal registradas
                </ThemedText>
              </Pressable>
            ) : null}

            {plannedForSelected.map((routine) => (
              <Pressable
                key={routine.id}
                onPress={() => router.push(`/routine/${routine.id}`)}
                style={({ pressed }) => [
                  styles.planned,
                  { borderColor: theme.border },
                  pressed && { backgroundColor: theme.backgroundElement },
                ]}>
                <Ionicons name="calendar-outline" size={18} color={theme.accentText} />
                <ThemedText type="small" style={styles.plannedText}>
                  Tocaba {routine.name}
                </ThemedText>
              </Pressable>
            ))}
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
  actions: { paddingHorizontal: 12, gap: 8 },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  planned: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  plannedText: { flex: 1 },
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
