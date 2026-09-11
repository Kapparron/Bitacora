import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useDailyKcal } from '@/features/nutrition/queries';
import {
  averagePerLoggedDay,
  countInMonth,
  currentStreak,
  monthOf,
  sumInMonth,
} from '@/features/progress/stats';
import { useWorkoutHistory } from '@/features/workout/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, toIsoDay } from '@/lib/format';

/** Window the calorie average covers. */
const AVERAGE_DAYS = 7;

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * Where the training and the diary stand right now: the two streaks, the recent
 * calorie average and what this month adds up to.
 *
 * Everything is derived from the day sets the workout and nutrition queries
 * already return, so the card follows every write without a query of its own.
 */
export function TotalsCard() {
  const theme = useTheme();
  const { workouts } = useWorkoutHistory();
  const kcalByDay = useDailyKcal();

  const today = toIsoDay();
  const month = monthOf(today);

  const trainedDays = useMemo(
    () => new Set(workouts.map((workout) => toIsoDay(new Date(workout.startedAt)))),
    [workouts]
  );

  const workoutStreak = currentStreak(trainedDays, today);
  const kcalStreak = currentStreak(new Set(kcalByDay.keys()), today);
  const recent = averagePerLoggedDay(kcalByDay, today, AVERAGE_DAYS);

  return (
    <View style={[styles.card, { borderColor: theme.border }]}>
      <ThemedText type="small" themeColor="textSecondary">
        TOTALES
      </ThemedText>

      <Row
        label="Racha de entrenos"
        value={workoutStreak === 0 ? '-' : plural(workoutStreak, 'dia', 'dias')}
      />
      <Row
        label="Racha de calorias"
        value={kcalStreak === 0 ? '-' : plural(kcalStreak, 'dia', 'dias')}
      />
      <Row
        label={`Media diaria (${AVERAGE_DAYS} dias)`}
        value={recent === null ? '-' : `${formatNumber(recent.average, 0)} kcal`}
        // The mean only covers the days that were filled in, so it says how many.
        hint={recent === null ? undefined : `sobre ${plural(recent.days, 'dia', 'dias')}`}
      />
      <Row label="Dias entrenados este mes" value={String(countInMonth(trainedDays, month))} />
      <Row
        label="Calorias este mes"
        value={`${formatNumber(sumInMonth(kcalByDay, month), 0)} kcal`}
      />
    </View>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLabel}>
        <ThemedText type="default">{label}</ThemedText>
        {hint ? (
          <ThemedText type="small" themeColor="textSecondary">
            {hint}
          </ThemedText>
        ) : null}
      </View>

      <ThemedText type="default" style={styles.rowValue}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowLabel: { flex: 1, gap: 1 },
  rowValue: { fontWeight: '700' },
});
