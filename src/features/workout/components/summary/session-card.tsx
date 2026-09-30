import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { WorkoutContents } from '@/features/workout/queries';
import { completedSetCount, totalVolume } from '@/features/workout/volume';
import { formatDay, formatDuration, formatNumber } from '@/lib/format';

import { SummaryCard } from './summary-card';

/** The session itself: its name and its four figures, once. */
export function SessionCard({ contents, size }: { contents: WorkoutContents; size: number }) {
  const { workout, entries } = contents;
  const allSets = entries.flatMap((entry) => entry.sets);
  const duration = workout.finishedAt === null ? null : workout.finishedAt - workout.startedAt;

  return (
    <SummaryCard size={size}>
      <ThemedText type="small" themeColor="textSecondary">
        {formatDay(workout.startedAt)}
      </ThemedText>
      <ThemedText type="default" style={styles.name} numberOfLines={2}>
        {workout.name}
      </ThemedText>

      <View style={styles.grid}>
        <Figure label="Duración" value={duration === null ? '-' : formatDuration(duration)} />
        <Figure label="Volumen" value={`${formatNumber(totalVolume(allSets), 0)} kg`} />
        <Figure label="Ejercicios" value={String(entries.length)} />
        <Figure label="Series" value={String(completedSetCount(allSets))} />
      </View>
    </SummaryCard>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.figure}>
      <ThemedText type="small" themeColor="textSecondary">
        {label.toUpperCase()}
      </ThemedText>
      <ThemedText type="default" style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 24, lineHeight: 30, fontWeight: '800' },
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'center' },
  figure: { width: '50%', paddingVertical: 12, gap: 2 },
  value: { fontSize: 28, lineHeight: 34, fontWeight: '800' },
});
