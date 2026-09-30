import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { RadarChart } from '@/features/charts/radar-chart';
import { MUSCLE_AXES, type MuscleLoad } from '@/features/workout/muscles';

import { SummaryCard } from './summary-card';

/** What the session worked, as a spider chart of working sets per axis. */
export function MusclesCard({ load, size }: { load: MuscleLoad; size: number }) {
  // What is left of the square once the padding, the heading and the name are out.
  const chart = size - 100;

  return (
    <SummaryCard size={size}>
      <ThemedText type="small" themeColor="textSecondary">
        SERIES EFECTIVAS POR GRUPO
      </ThemedText>
      <View style={styles.chart}>
        <RadarChart
          axes={MUSCLE_AXES.map((axis) => ({ label: axis.label, value: load[axis.id] }))}
          size={chart}
        />
      </View>
    </SummaryCard>
  );
}

const styles = StyleSheet.create({
  chart: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
