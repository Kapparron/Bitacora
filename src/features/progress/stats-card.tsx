import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useDailyKcal } from '@/features/nutrition/queries';
import {
  averageInMonth,
  countInMonth,
  currentStreak,
  longestStreakInMonth,
  monthOf,
} from '@/features/progress/stats';
import { useWorkoutHistory } from '@/features/workout/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, toIsoDay } from '@/lib/format';

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * How the training and the diary went in one month, following whichever month
 * the calendar is showing.
 *
 * The streaks are the running ones while that month is the current one, and the
 * longest run inside the month for any other: a streak is a live thing, so
 * asking for one in March means asking how good March got.
 *
 * Everything is derived from the day sets the workout and nutrition queries
 * already return, so the card follows every write without a query of its own.
 */
export function StatsCard({ month }: { month: string }) {
  const theme = useTheme();
  const { workouts } = useWorkoutHistory();
  const kcalByDay = useDailyKcal();

  const today = toIsoDay();
  const current = monthOf(today) === month;

  const trainedDays = useMemo(
    () => new Set(workouts.map((workout) => toIsoDay(new Date(workout.startedAt)))),
    [workouts]
  );

  const loggedDays = useMemo(() => new Set(kcalByDay.keys()), [kcalByDay]);

  const workoutStreak = current
    ? currentStreak(trainedDays, today)
    : longestStreakInMonth(trainedDays, month);
  const kcalStreak = current
    ? currentStreak(loggedDays, today)
    : longestStreakInMonth(loggedDays, month);

  const average = averageInMonth(kcalByDay, month);

  return (
    <View style={[styles.card, { borderColor: theme.border }]}>
      <ThemedText type="small" themeColor="textSecondary">
        ESTADISTICAS
      </ThemedText>

      <Row
        label={current ? 'Racha de entrenos' : 'Mejor racha de entrenos'}
        value={workoutStreak === 0 ? '-' : plural(workoutStreak, 'dia', 'dias')}
      />
      <Row
        label={current ? 'Racha de calorias' : 'Mejor racha de calorias'}
        value={kcalStreak === 0 ? '-' : plural(kcalStreak, 'dia', 'dias')}
      />
      <Row
        label="Media diaria de calorias"
        value={average === null ? '-' : `${formatNumber(average, 0)} kcal`}
      />
      <Row label="Dias entrenados" value={String(countInMonth(trainedDays, month))} />
      <Row label="Dias con calorias" value={String(countInMonth(loggedDays, month))} />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <ThemedText type="default" style={styles.rowLabel}>
        {label}
      </ThemedText>

      <ThemedText type="default" style={styles.rowValue}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowLabel: { flex: 1 },
  rowValue: { fontWeight: '700' },
});
