import Ionicons from '@expo/vector-icons/Ionicons';
import { useLayoutEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { ThemedText } from '@/components/themed-text';
import type { Exercise } from '@/db/schema';
import { ExerciseThumbnail } from '@/features/exercises/components/exercise-thumbnail';
import { useTheme } from '@/hooks/use-theme';
import { moveItem, reorderBlocks } from '@/lib/reorder';

/** Every row is collapsed to the same height, which is what keeps dragging simple. */
const ROW_HEIGHT = 60;
const BLOCK_GAP = 8;
const SETTLE_MS = 150;

export type ReorderItem = {
  id: string;
  supersetGroup: number | null;
  exercise: Pick<Exercise, 'id' | 'name' | 'imagePath'>;
};

/**
 * Full-screen list of exercises collapsed to name and still, reordered by holding
 * one and dragging it. Cards with their sets unfolded are too tall to drag
 * through. A superset moves as a whole, so a group is never split.
 *
 * Every drop is saved at once through `onReorder`, with the ids in their new
 * order. Render it only while it is open.
 */
export function ReorderSheet({
  items,
  onReorder,
  onClose,
}: {
  items: readonly ReorderItem[];
  onReorder: (orderedIds: string[]) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // Owned here from the moment it opens, so a reload of the screen behind cannot
  // move rows around under the finger.
  const [blocks, setBlocks] = useState(() => reorderBlocks(items));

  /** Index of the block being dragged, or -1. */
  const active = useSharedValue(-1);
  /** Index the dragged block would take if dropped now. */
  const target = useSharedValue(-1);
  const dragY = useSharedValue(0);

  const heights = blocks.map((block) => block.length * ROW_HEIGHT + BLOCK_GAP);
  const tops = heights.map((_, index) => heights.slice(0, index).reduce((sum, h) => sum + h, 0));

  // The new order is laid out by now, so the offsets that faked it are dropped
  // in the same frame instead of animating back.
  useLayoutEffect(() => {
    active.value = -1;
    target.value = -1;
    dragY.value = 0;
  }, [blocks, active, target, dragY]);

  function drop(from: number, to: number) {
    const next = moveItem(blocks, from, to);
    setBlocks(next);
    if (from !== to) onReorder(next.flat().map((item) => item.id));
  }

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <GestureHandlerRootView style={[styles.screen, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerText}>
            <ThemedText type="default" style={styles.title}>
              Reordenar ejercicios
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Manten pulsado y arrastra. Las superseries se mueven enteras.
            </ThemedText>
          </View>

          <Pressable onPress={onClose} hitSlop={8}>
            <ThemedText type="default" style={{ color: theme.accentText, fontWeight: '700' }}>
              Listo
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
          {blocks.map((block, index) => (
            <DraggableBlock
              key={block[0].id}
              block={block}
              index={index}
              tops={tops}
              heights={heights}
              active={active}
              target={target}
              dragY={dragY}
              onDrop={drop}
            />
          ))}
        </ScrollView>
      </GestureHandlerRootView>
    </Modal>
  );
}

function DraggableBlock({
  block,
  index,
  tops,
  heights,
  active,
  target,
  dragY,
  onDrop,
}: {
  block: ReorderItem[];
  index: number;
  tops: number[];
  heights: number[];
  active: SharedValue<number>;
  target: SharedValue<number>;
  dragY: SharedValue<number>;
  onDrop: (from: number, to: number) => void;
}) {
  const theme = useTheme();
  const superset = block[0].supersetGroup;

  // A long press, so a plain swipe still scrolls the list.
  const pan = Gesture.Pan()
    .activateAfterLongPress(200)
    .onStart(() => {
      // One block at a time, including while the last one is still settling.
      if (active.value !== -1) return;
      active.value = index;
      target.value = index;
    })
    .onUpdate((event) => {
      if (active.value !== index) return;
      dragY.value = event.translationY;

      // The target is how many of the other blocks have their middle above the
      // middle of the one being dragged.
      const middle = tops[index] + event.translationY + heights[index] / 2;
      let rank = 0;
      for (let other = 0; other < tops.length; other += 1) {
        if (other !== index && tops[other] + heights[other] / 2 < middle) rank += 1;
      }
      target.value = rank;
    })
    .onFinalize(() => {
      if (active.value !== index) return;

      const to = target.value;
      let landing = 0;
      for (let other = 0, rank = 0; other < tops.length; other += 1) {
        if (other === index) continue;
        if (rank < to) landing += heights[other];
        rank += 1;
      }

      dragY.value = withTiming(landing - tops[index], { duration: SETTLE_MS }, () => {
        scheduleOnRN(onDrop, index, to);
      });
    });

  const animated = useAnimatedStyle(() => {
    const dragging = active.value;

    if (dragging === index) {
      return { zIndex: 1, opacity: 0.9, transform: [{ translateY: dragY.value }] };
    }

    // The rest make room: those between the old and the new place shift by the
    // height of the dragged block.
    let shift = 0;
    if (dragging !== -1) {
      if (index < dragging && index >= target.value) shift = heights[dragging];
      if (index > dragging && index - 1 < target.value) shift = -heights[dragging];
    }

    return {
      zIndex: 0,
      opacity: 1,
      transform: [{ translateY: dragging === -1 ? 0 : withTiming(shift, { duration: SETTLE_MS }) }],
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ height: heights[index] }, animated]}>
        <View
          style={[
            styles.block,
            { backgroundColor: theme.backgroundElement },
            superset !== null && { borderLeftWidth: 3, borderLeftColor: theme.accent },
          ]}>
          {block.map((item) => (
            <View key={item.id} style={styles.row}>
              {/* Only a picture here: opening the exercise would leave this sheet. */}
              <View pointerEvents="none">
                <ExerciseThumbnail exercise={item.exercise} size={40} />
              </View>

              <ThemedText type="default" numberOfLines={1} style={styles.name}>
                {item.exercise.name}
              </ThemedText>

              <Ionicons name="reorder-three" size={24} color={theme.textSecondary} />
            </View>
          ))}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 12 },
  headerText: { flex: 1, gap: 2 },
  title: { fontWeight: '700' },
  content: { paddingHorizontal: 12, paddingTop: 4 },
  block: { flex: 1, marginBottom: BLOCK_GAP, borderRadius: 12, overflow: 'hidden' },
  row: { height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12 },
  name: { flex: 1, fontWeight: '600' },
});
