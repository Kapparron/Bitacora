import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { describeComparison, type Comparison } from '@/features/workout/comparison';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber } from '@/lib/format';

import { SummaryCard } from './summary-card';

/** The heading and the sentence, which the silhouette shares the square with. */
const TEXT_ROOM = 150;

/**
 * The session's volume measured in dinosaurs: the biggest it could lift and how
 * many. A ladder rather than loose objects, so climbing a rung reads as
 * progress. Silhouettes from PhyloPic, all in the public domain.
 */
export function DinosaurCard({
  volume,
  comparison,
  size,
}: {
  volume: number;
  comparison: Comparison;
  size: number;
}) {
  const theme = useTheme();
  const { dinosaur } = comparison;
  const [, , width, height] = dinosaur.viewBox.split(' ').map(Number);

  // As wide as the card allows, unless that makes it taller than the room left.
  const room = size - TEXT_ROOM;
  const drawnWidth = Math.min(size - 40, (room * width) / height);

  return (
    <SummaryCard size={size}>
      <ThemedText type="small" themeColor="textSecondary">
        HAS LEVANTADO
      </ThemedText>
      <ThemedText type="default" style={styles.volume}>
        {formatNumber(volume, 0)} kg
      </ThemedText>

      <View style={styles.drawing}>
        <Svg width={drawnWidth} height={(drawnWidth * height) / width} viewBox={dinosaur.viewBox}>
          <Path d={dinosaur.path} fill={theme.accent} />
        </Svg>
      </View>

      <ThemedText type="default" style={styles.sentence}>
        Como levantar {describeComparison(comparison)}
      </ThemedText>
    </SummaryCard>
  );
}

const styles = StyleSheet.create({
  volume: { fontSize: 28, lineHeight: 34, fontWeight: '800' },
  drawing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sentence: { fontSize: 18, lineHeight: 24, fontWeight: '700', textAlign: 'center' },
});
