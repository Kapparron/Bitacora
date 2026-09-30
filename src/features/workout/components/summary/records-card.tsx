import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { WorkoutRecord } from '@/features/workout/queries';
import { RECORD_LABEL, formatRecordValue } from '@/features/workout/records';
import { useTheme } from '@/hooks/use-theme';

import { SummaryCard } from './summary-card';

/** More than this and the square runs out of room; the rest are counted. */
const SHOWN = 5;

/** The records this session set. Only drawn when it set any. */
export function RecordsCard({ records, size }: { records: WorkoutRecord[]; size: number }) {
  const theme = useTheme();
  const hidden = records.length - SHOWN;

  return (
    <SummaryCard size={size}>
      <View style={styles.head}>
        <Ionicons name="trophy" size={40} color={theme.accentText} />
        <ThemedText type="default" style={styles.title}>
          {records.length === 1 ? '1 récord nuevo' : `${records.length} récords nuevos`}
        </ThemedText>
      </View>

      <View style={styles.list}>
        {records.slice(0, SHOWN).map((record) => (
          <View key={record.id} style={styles.row}>
            <View style={styles.what}>
              <ThemedText type="default" style={styles.exercise} numberOfLines={1}>
                {record.exerciseName}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {RECORD_LABEL[record.type]}
              </ThemedText>
            </View>
            <ThemedText type="default" style={styles.value}>
              {formatRecordValue(record.type, record.value)}
            </ThemedText>
          </View>
        ))}

        {hidden > 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            y {hidden} más
          </ThemedText>
        ) : null}
      </View>
    </SummaryCard>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '800', flex: 1 },
  list: { flex: 1, justifyContent: 'center', gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  what: { flex: 1 },
  exercise: { fontWeight: '700' },
  value: { fontWeight: '800' },
});
