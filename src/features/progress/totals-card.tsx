import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useWeeklyVolume } from '@/features/workout/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber } from '@/lib/format';

/**
 * What the training adds up to: sessions, volume and the weeks that held one.
 * Shown on the profile and on the workout tab while no calendar day is picked,
 * so both read the same figures from the same query.
 */
export function TotalsCard() {
  const theme = useTheme();
  const weeks = useWeeklyVolume();

  const sessions = weeks.reduce((sum, week) => sum + week.workouts, 0);
  const volume = weeks.reduce((sum, week) => sum + week.volume, 0);
  const weeksTrained = weeks.filter((week) => week.workouts > 0).length;

  return (
    <View style={[styles.card, { borderColor: theme.border }]}>
      <ThemedText type="small" themeColor="textSecondary">
        TOTALES
      </ThemedText>

      <Row label="Entrenos" value={String(sessions)} />
      <Row label="Volumen acumulado" value={`${formatNumber(volume, 0)} kg`} />
      <Row label="Semanas con entreno" value={String(weeksTrained)} />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <ThemedText type="default">{label}</ThemedText>
      <ThemedText type="default" style={styles.rowValue}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowValue: { fontWeight: '700' },
});
