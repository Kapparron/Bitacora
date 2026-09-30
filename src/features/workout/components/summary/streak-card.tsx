import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { progressFor, tierFor } from '@/features/progress/streak';
import { useTheme } from '@/hooks/use-theme';

import { SummaryCard } from './summary-card';

/**
 * The training streak, with the flame of its tier and the next mark to reach:
 * the same steps as the streak on the profile, drawn large.
 */
export function StreakCard({ days, size }: { days: number; size: number }) {
  const theme = useTheme();
  const color = tierFor(days)?.color ?? theme.textSecondary;
  const { remaining, next } = progressFor(days);

  return (
    <SummaryCard size={size}>
      <View style={styles.center}>
        <Ionicons name="flame" size={size * 0.3} color={color} />
        <ThemedText style={[styles.number, { color }]}>{days}</ThemedText>
        <ThemedText type="default" style={styles.label}>
          {days === 1 ? 'día seguido entrenando' : 'días seguidos entrenando'}
        </ThemedText>
        {next !== null && remaining !== null ? (
          <ThemedText type="small" themeColor="textSecondary">
            {remaining === 1 ? 'Falta 1 día' : `Faltan ${remaining} días`} para los {next}
          </ThemedText>
        ) : null}
      </View>
    </SummaryCard>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  number: { fontSize: 72, lineHeight: 80, fontWeight: '900' },
  label: { fontWeight: '700' },
});
