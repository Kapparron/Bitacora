import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { setRestWeekdays } from '@/features/rest/mutations';
import { useRestPlan } from '@/features/rest/queries';
import { WEEKDAY_INITIALS } from '@/features/routines/schedule';
import { useTheme } from '@/hooks/use-theme';

/**
 * The weekdays kept for rest. A rest day does not add to the training streak,
 * but it does not end it either; two rest days in a row do.
 *
 * A single odd day is marked from the calendar instead, which overrides this
 * rule for that date.
 */
export function RestWeekdaysCard() {
  const theme = useTheme();
  const rest = useRestPlan();

  function toggle(weekday: number) {
    const next = new Set(rest.weekdays);
    if (next.has(weekday)) next.delete(weekday);
    else next.add(weekday);

    void setRestWeekdays(next);
  }

  return (
    <View style={[styles.card, { borderColor: theme.border }]}>
      <ThemedText type="small" themeColor="textSecondary">
        DIAS DE DESCANSO
      </ThemedText>

      <View style={styles.days}>
        {WEEKDAY_INITIALS.map((initial, weekday) => {
          const active = rest.weekdays.has(weekday);

          return (
            <Pressable
              key={weekday}
              onPress={() => toggle(weekday)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              style={({ pressed }) => [
                styles.day,
                { backgroundColor: active ? theme.accent : theme.backgroundElement },
                pressed && { opacity: 0.6 },
              ]}>
              <ThemedText
                type="small"
                style={{ color: active ? theme.onAccent : theme.text, fontWeight: '700' }}>
                {initial}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        Un descanso no suma a la racha, pero tampoco la corta. Dos seguidos si. Manten pulsado un
        dia del calendario para marcarlo como descanso suelto.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: 10 },
  days: { flexDirection: 'row', gap: 8 },
  day: { flex: 1, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
