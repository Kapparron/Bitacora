import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { LineChart } from '@/features/charts/line-chart';
import { useDailyKcal } from '@/features/nutrition/queries';
import { useWeeklyVolume } from '@/features/workout/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatNumber } from '@/lib/format';

/** Days of kcal to plot. Longer than that and single days stop being readable. */
const KCAL_DAYS = 30;

/** `YYYY-MM-DD` as a local timestamp at midday, away from any DST edge. */
function dayTimestamp(day: string): number {
  return new Date(`${day}T12:00:00`).getTime();
}

/**
 * Training volume and calories over time, as a block of cards for the profile
 * screen. Both read from the same tables the rest of the app writes, so there is
 * nothing to keep in sync.
 */
export function ProgressPanel() {
  const theme = useTheme();
  const weeks = useWeeklyVolume();
  const kcalByDay = useDailyKcal();

  const kcalPoints = [...kcalByDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-KCAL_DAYS)
    .map(([day, kcal]) => ({ x: dayTimestamp(day), y: kcal }));

  const thisWeek = weeks.at(-1);
  const previousWeek = weeks.at(-2);
  const weekChange =
    thisWeek && previousWeek && previousWeek.volume > 0
      ? ((thisWeek.volume - previousWeek.volume) / previousWeek.volume) * 100
      : null;

  const totalSessions = weeks.reduce((sum, week) => sum + week.workouts, 0);

  return (
    <>
      <View style={[styles.card, { borderColor: theme.border }]}>
        <ThemedText type="small" themeColor="textSecondary">
          VOLUMEN POR SEMANA
        </ThemedText>

        <ThemedText type="subtitle" style={styles.headline}>
          {thisWeek ? `${formatNumber(thisWeek.volume, 0)} kg` : '-'}
        </ThemedText>

        <ThemedText type="small" themeColor="textSecondary">
          {thisWeek
            ? `${thisWeek.workouts} ${thisWeek.workouts === 1 ? 'entreno' : 'entrenos'} esta semana`
            : 'Sin entrenos registrados.'}
          {weekChange !== null
            ? ` · ${weekChange >= 0 ? '+' : ''}${formatNumber(weekChange, 0)} % respecto a la anterior`
            : ''}
        </ThemedText>

        <LineChart
          points={weeks.map((week) => ({ x: dayTimestamp(week.week), y: week.volume }))}
          formatValue={(value) => `${formatNumber(value, 0)} kg`}
          formatX={(x) => formatDay(x)}
        />
      </View>

      <View style={[styles.card, { borderColor: theme.border }]}>
        <ThemedText type="small" themeColor="textSecondary">
          CALORIAS POR DIA
        </ThemedText>

        <ThemedText type="subtitle" style={styles.headline}>
          {kcalPoints.length > 0
            ? `${formatNumber(
                kcalPoints.reduce((sum, point) => sum + point.y, 0) / kcalPoints.length,
                0,
              )} kcal`
            : '-'}
        </ThemedText>

        <ThemedText type="small" themeColor="textSecondary">
          {kcalPoints.length > 0
            ? `Media de los ultimos ${kcalPoints.length} dias con registro`
            : 'Sin comidas registradas.'}
        </ThemedText>

        <LineChart
          points={kcalPoints}
          formatValue={(value) => `${formatNumber(value, 0)}`}
          formatX={(x) => formatDay(x)}
          color={theme.accentText}
        />
      </View>

      <View style={[styles.card, { borderColor: theme.border }]}>
        <ThemedText type="small" themeColor="textSecondary">
          TOTALES
        </ThemedText>

        <View style={styles.row}>
          <ThemedText type="default">Entrenos</ThemedText>
          <ThemedText type="default" style={styles.rowValue}>
            {totalSessions}
          </ThemedText>
        </View>

        <View style={styles.row}>
          <ThemedText type="default">Volumen acumulado</ThemedText>
          <ThemedText type="default" style={styles.rowValue}>
            {formatNumber(
              weeks.reduce((sum, week) => sum + week.volume, 0),
              0,
            )}{' '}
            kg
          </ThemedText>
        </View>

        <View style={styles.row}>
          <ThemedText type="default">Semanas con entreno</ThemedText>
          <ThemedText type="default" style={styles.rowValue}>
            {weeks.filter((week) => week.workouts > 0).length}
          </ThemedText>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: 8 },
  headline: { fontSize: 30, lineHeight: 36 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowValue: { fontWeight: '700' },
});
