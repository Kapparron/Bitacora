import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { progressFor, tierFor } from '@/features/progress/streak';
import { useTheme } from '@/hooks/use-theme';

const RING_SIZE = 46;
const RING_WIDTH = 3;
const RADIUS = (RING_SIZE - RING_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * A streak, as a flame that grows with it inside a ring that fills towards the
 * next mark.
 *
 * The two carry different news on purpose: the flame says how far this has come,
 * the ring how close the next step is. A streak of nothing shows the empty ring
 * and an unlit flame rather than disappearing, so the row still says what is
 * being counted.
 */
export function StreakRow({ label, days }: { label: string; days: number }) {
  const theme = useTheme();
  const tier = tierFor(days);
  const { remaining, next, ratio } = progressFor(days);

  const color = tier?.color ?? theme.textSecondary;
  // The ring starts at twelve o'clock and fills clockwise.
  const filled = CIRCUMFERENCE * ratio;

  return (
    <View style={styles.row}>
      <View style={styles.badge}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={theme.backgroundElement}
            strokeWidth={RING_WIDTH}
            fill="none"
          />
          {days > 0 ? (
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              stroke={color}
              strokeWidth={RING_WIDTH}
              strokeLinecap="round"
              strokeDasharray={`${filled} ${CIRCUMFERENCE - filled}`}
              // -90° so the arc starts at the top instead of at three o'clock.
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              fill="none"
            />
          ) : null}
        </Svg>

        <View style={styles.flame}>
          <Ionicons
            name={days > 0 ? 'flame' : 'flame-outline'}
            size={tier?.size ?? 16}
            color={color}
          />
        </View>
      </View>

      <View style={styles.text}>
        <ThemedText type="default">{label}</ThemedText>

        <ThemedText type="small" themeColor="textSecondary">
          {days === 0
            ? 'Sin racha'
            : next === null
              ? plural(days, 'dia', 'dias')
              : `${plural(days, 'dia', 'dias')} · faltan ${remaining} para ${next}`}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  // Sits on top of the ring, which the badge lays out.
  flame: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 1 },
});
