import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { WeekDay } from '@/features/progress/stats';
import { WEEKDAY_INITIALS } from '@/features/routines/schedule';
import { useTheme } from '@/hooks/use-theme';

import { SummaryCard } from './summary-card';

/** The seven days ending today: trained, rested, or neither. */
export function WeekCard({ week, size }: { week: WeekDay[]; size: number }) {
  const theme = useTheme();
  const trained = week.filter((day) => day.trained).length;
  const dot = Math.floor((size - 40) / 7) - 6;

  return (
    <SummaryCard size={size}>
      <ThemedText type="small" themeColor="textSecondary">
        ÚLTIMOS 7 DÍAS
      </ThemedText>
      <ThemedText type="default" style={styles.title}>
        {trained === 1 ? 'Has entrenado 1 vez' : `Has entrenado ${trained} veces`}
      </ThemedText>

      <View style={styles.days}>
        {week.map((day) => (
          <View key={day.day} style={styles.day}>
            <View
              style={[
                styles.dot,
                { width: dot, height: dot, borderRadius: dot / 2, borderColor: theme.border },
                day.trained && { backgroundColor: theme.accent, borderColor: theme.accent },
              ]}>
              {day.trained ? (
                <Ionicons name="checkmark" size={dot * 0.6} color={theme.onAccent} />
              ) : day.resting ? (
                <Ionicons name="moon" size={dot * 0.45} color={theme.textSecondary} />
              ) : null}
            </View>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {WEEKDAY_INITIALS[day.weekday]}
            </ThemedText>
          </View>
        ))}
      </View>
    </SummaryCard>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800' },
  days: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: 6 },
  dot: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
