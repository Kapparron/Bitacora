import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Body, { type ExtendedBodyPart, type Slug } from 'react-native-body-highlighter';

import { ThemedText } from '@/components/themed-text';
import { BODY_SHADES, bodyLoad, type BodyPartLoad } from '@/features/workout/muscles';
import { useTheme } from '@/hooks/use-theme';

/** The drawing is 200 × 400 points per side at scale 1. */
export const BODY_SIDE_WIDTH = 200;
export const BODY_SIDE_HEIGHT = 400;

/** Opacity of the accent for each shade, lightest first; the last is solid. */
const SHADE_ALPHA = ['59', 'A6', ''];

function useShades(): string[] {
  const theme = useTheme();
  // theme.accent is `#rrggbb`, so a two-digit alpha can be appended to it.
  return useMemo(() => SHADE_ALPHA.map((alpha) => `${theme.accent}${alpha}`), [theme.accent]);
}

/**
 * The body front and back, with the muscles worked painted darker the more
 * working sets they got. Drawn by react-native-body-highlighter: a body with
 * every muscle as its own shape is not something to draw by hand.
 *
 * Memoised on `load`: the session screen re-renders every second for its clock,
 * and this is hundreds of paths that only change when a set is ticked.
 */
export const BodyMap = memo(function BodyMap({
  load,
  scale,
}: {
  load: BodyPartLoad[];
  scale: number;
}) {
  const theme = useTheme();
  const colors = useShades();
  const data = useMemo<ExtendedBodyPart[]>(
    () => load.map((part) => ({ slug: part.part as Slug, intensity: part.shade })),
    [load]
  );

  const drawing = {
    data,
    colors,
    scale,
    border: 'none',
    defaultFill: theme.backgroundSelected,
  } as const;

  return (
    <View style={styles.bodies}>
      <Body {...drawing} side="front" />
      <Body {...drawing} side="back" />
    </View>
  );
});

/**
 * `bodyLoad` for a session that is still being logged. The result keeps its
 * identity until a part changes shade, so typing a weight, which rewrites the
 * set but paints nothing new, does not redraw the body.
 */
export function useBodyLoad(entries: Parameters<typeof bodyLoad>[0]): BodyPartLoad[] {
  const load = bodyLoad(entries);
  const shading = load.map((part) => `${part.part}:${part.shade}`).join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => load, [shading]);
}

/** What each shade means, in working sets. */
export function BodyLegend() {
  const colors = useShades();

  return (
    <View style={styles.legend}>
      {BODY_SHADES.map((from, index) => {
        const to = BODY_SHADES[index + 1];
        return (
          <View key={from} style={styles.shade}>
            <View style={[styles.swatch, { backgroundColor: colors[index] }]} />
            <ThemedText type="small" themeColor="textSecondary">
              {to === undefined ? `${from}+` : `${from}-${to - 1}`}
            </ThemedText>
          </View>
        );
      })}
      <ThemedText type="small" themeColor="textSecondary">
        series
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  bodies: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  shade: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
});
