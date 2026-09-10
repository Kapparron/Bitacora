import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber } from '@/lib/format';
import type { DayTotals } from '../queries';

type Goal = { kcal: number; protein: number | null; carbs: number | null; fat: number | null };

/**
 * The day's totals against the goal in force. Without a goal it still shows what
 * was eaten: the diary has to be useful before anything is configured.
 */
export function MacroSummary({ totals, goal }: { totals: DayTotals; goal: Goal | null }) {
  const theme = useTheme();
  const remaining = goal ? goal.kcal - totals.kcal : null;

  return (
    <View style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.headline}>
        <View>
          <ThemedText type="small" themeColor="textSecondary">
            CALORIAS
          </ThemedText>
          <ThemedText type="subtitle" style={styles.kcal}>
            {formatNumber(totals.kcal, 0)}
            {goal ? (
              <ThemedText type="default" themeColor="textSecondary">
                {' '}
                / {formatNumber(goal.kcal, 0)}
              </ThemedText>
            ) : null}
          </ThemedText>
        </View>

        {remaining !== null ? (
          <View style={styles.remaining}>
            <ThemedText type="small" themeColor="textSecondary">
              {remaining >= 0 ? 'TE QUEDAN' : 'TE HAS PASADO'}
            </ThemedText>
            <ThemedText
              type="default"
              style={{ fontWeight: '700', color: remaining >= 0 ? theme.text : theme.danger }}>
              {formatNumber(Math.abs(remaining), 0)} kcal
            </ThemedText>
          </View>
        ) : null}
      </View>

      {goal ? <Bar value={totals.kcal} target={goal.kcal} color={theme.accent} /> : null}

      <View style={styles.macros}>
        <Macro label="Proteina" value={totals.protein} target={goal?.protein ?? null} />
        <Macro label="Carbos" value={totals.carbs} target={goal?.carbs ?? null} />
        <Macro label="Grasa" value={totals.fat} target={goal?.fat ?? null} />
      </View>
    </View>
  );
}

function Macro({
  label,
  value,
  target,
}: {
  label: string;
  value: number;
  target: number | null;
}) {
  const theme = useTheme();

  return (
    <View style={styles.macro}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="default" style={styles.macroValue}>
        {formatNumber(value, 0)} g
      </ThemedText>
      {target ? (
        <>
          <Bar value={value} target={target} color={theme.accentText} />
          <ThemedText type="small" themeColor="textSecondary">
            de {formatNumber(target, 0)} g
          </ThemedText>
        </>
      ) : null}
    </View>
  );
}

function Bar({ value, target, color }: { value: number; target: number; color: string }) {
  const theme = useTheme();
  const ratio = target > 0 ? Math.min(1, value / target) : 0;
  const over = value > target;

  return (
    <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
      <View
        style={[
          styles.fill,
          { width: `${ratio * 100}%`, backgroundColor: over ? theme.danger : color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  headline: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  kcal: { fontSize: 30, lineHeight: 36 },
  remaining: { alignItems: 'flex-end', gap: 2 },
  macros: { flexDirection: 'row', gap: 12 },
  macro: { flex: 1, gap: 3 },
  macroValue: { fontWeight: '700' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
