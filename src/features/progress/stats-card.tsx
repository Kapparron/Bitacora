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
import { StreakRow } from '@/features/progress/streak-row';
import { useWorkoutHistory } from '@/features/workout/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, toIsoDay } from '@/lib/format';

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

      <StreakRow
        label={current ? 'Racha de entrenos' : 'Mejor racha de entrenos'}
        days={workoutStreak}
      />
      <StreakRow
        label={current ? 'Racha de calorias' : 'Mejor racha de calorias'}
        days={kcalStreak}
      />

      <View style={[styles.divider, { backgroundColor: theme.border }]} />
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
  card: { padding: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: 10 },
  divider: { height: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowLabel: { flex: 1 },
  rowValue: { fontWeight: '700' },
});
