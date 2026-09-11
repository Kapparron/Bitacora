import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

/** How long the bubble stays up, including the fade out. */
const LIFETIME_MS = 2200;

/**
 * The note that pops up over an exercise when a set has just reached a record.
 *
 * It rises and fades on its own and reports when it is done, so the card can
 * unmount it: it sits over the sets and would swallow taps if it stayed.
 */
export function RecordBubble({ label, onDone }: { label: string; onDone: () => void }) {
  const theme = useTheme();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: LIFETIME_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished) onDone();
    });

    return () => animation.stop();
    // Started once per bubble; a new record mounts a new one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [6, -26] });
  // Fades in quickly, holds, then leaves.
  const opacity = progress.interpolate({
    inputRange: [0, 0.12, 0.7, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bubble,
        { backgroundColor: theme.accent, shadowColor: theme.text, opacity, transform: [{ translateY }] },
      ]}>
      <Ionicons name="medal" size={16} color={theme.onAccent} />
      <ThemedText type="small" style={[styles.label, { color: theme.onAccent }]}>
        {label}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    top: 8,
    right: 12,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    elevation: 6,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  label: { fontWeight: '700' },
});
