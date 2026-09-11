import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { LineChart } from '@/features/charts/line-chart';
import { useDailyKcal } from '@/features/nutrition/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatNumber } from '@/lib/format';

/** Days of kcal to plot. Longer than that and single days stop being readable. */
const KCAL_DAYS = 30;

/** `YYYY-MM-DD` as a local timestamp at midday, away from any DST edge. */
function dayTimestamp(day: string): number {
  return new Date(`${day}T12:00:00`).getTime();
}

/**
 * Calories over time, as a card for the profile screen. It reads the same table
 * the diary writes, so there is nothing to keep in sync.
 */
export function ProgressPanel() {
  const theme = useTheme();
  const kcalByDay = useDailyKcal();

  const kcalPoints = [...kcalByDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-KCAL_DAYS)
    .map(([day, kcal]) => ({ x: dayTimestamp(day), y: kcal }));

  return (
    <>
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

    </>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: 8 },
  headline: { fontSize: 30, lineHeight: 36 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowValue: { fontWeight: '700' },
});
