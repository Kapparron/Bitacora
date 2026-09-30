import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  BODY_SIDE_HEIGHT,
  BODY_SIDE_WIDTH,
  BodyLegend,
  BodyMap,
} from '@/features/workout/components/body-map';
import type { BodyPartLoad } from '@/features/workout/muscles';

import { SummaryCard } from './summary-card';

/** The heading and the legend, which the bodies share the square with. */
const TEXT_ROOM = 120;

/** The muscles the session worked, on the body front and back. */
export function BodyCard({ load, size }: { load: BodyPartLoad[]; size: number }) {
  const scale = Math.min((size - TEXT_ROOM) / BODY_SIDE_HEIGHT, (size - 40) / (BODY_SIDE_WIDTH * 2));

  return (
    <SummaryCard size={size}>
      <ThemedText type="small" themeColor="textSecondary">
        MÚSCULOS DEL DÍA
      </ThemedText>

      <View style={styles.bodies}>
        <BodyMap load={load} scale={scale} />
      </View>

      <BodyLegend />
    </SummaryCard>
  );
}

const styles = StyleSheet.create({
  bodies: { flex: 1, justifyContent: 'center' },
});
