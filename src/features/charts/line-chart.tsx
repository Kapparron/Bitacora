import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export type ChartPoint = {
  /** Position on the horizontal axis, normally a timestamp. */
  x: number;
  y: number;
};

const HEIGHT = 160;
const PADDING = 8;

/**
 * Minimal line chart over `react-native-svg`. Written here rather than pulled
 * from a charting library: the app draws one shape, and the libraries bring
 * their own theming, gesture handling and axis formatting to fight with.
 *
 * The horizontal axis is proportional to `x`, so gaps between measurements show
 * as gaps rather than being evened out.
 */
export function LineChart({
  points,
  formatValue,
  formatX,
  color,
  reference,
}: {
  points: ChartPoint[];
  formatValue: (value: number) => string;
  /** Labels under the first and last point. */
  formatX: (x: number) => string;
  color?: string;
  /** A value to mark with a dashed line across the plot, such as a target. */
  reference?: number;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const stroke = color ?? theme.accent;

  if (points.length < 2) {
    return (
      <View style={[styles.empty, { height: HEIGHT }]}>
        <ThemedText type="small" themeColor="textSecondary">
          Hacen falta al menos dos registros para ver la evolucion.
        </ThemedText>
      </View>
    );
  }

  // The reference joins the domain: a target off the top of the plot would be
  // marked by a line nobody can see.
  const values = points.map((point) => point.y);
  const domain = reference === undefined ? values : [...values, reference];
  const minY = Math.min(...domain);
  const maxY = Math.max(...domain);
  // A flat series would divide by zero; spread it around its own value instead.
  const spanY = maxY - minY || Math.abs(maxY) || 1;

  const minX = points[0].x;
  const maxX = points[points.length - 1].x;
  const spanX = maxX - minX || 1;

  const plotWidth = Math.max(width - PADDING * 2, 1);
  const plotHeight = HEIGHT - PADDING * 2;

  const toX = (x: number) => PADDING + ((x - minX) / spanX) * plotWidth;
  const toY = (y: number) => PADDING + (1 - (y - minY) / spanY) * plotHeight;

  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${toX(point.x)},${toY(point.y)}`)
    .join(' ');

  const last = points[points.length - 1];

  return (
    <View style={styles.container} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <View style={styles.scale}>
        <ThemedText type="small" themeColor="textSecondary">
          {formatValue(maxY)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatValue(minY)}
        </ThemedText>
      </View>

      {width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          <Line
            x1={PADDING}
            y1={HEIGHT - PADDING}
            x2={width - PADDING}
            y2={HEIGHT - PADDING}
            stroke={theme.border}
            strokeWidth={StyleSheet.hairlineWidth}
          />
          {reference !== undefined ? (
            <Line
              x1={PADDING}
              y1={toY(reference)}
              x2={width - PADDING}
              y2={toY(reference)}
              stroke={theme.textSecondary}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          ) : null}
          <Path d={path} stroke={stroke} strokeWidth={2} fill="none" />
          <Circle cx={toX(last.x)} cy={toY(last.y)} r={4} fill={stroke} />
        </Svg>
      ) : (
        <View style={{ height: HEIGHT }} />
      )}

      <View style={styles.axis}>
        <ThemedText type="small" themeColor="textSecondary">
          {formatX(minX)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatX(maxX)}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 2 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  scale: { flexDirection: 'row', justifyContent: 'space-between' },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
});
