import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Vibration, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/lib/format';
import { useRestTimer } from '../rest-timer';

/**
 * Countdown shown while resting between sets. It reads the clock on every tick
 * instead of counting down, so the remaining time stays right after the app has
 * been backgrounded and timers were throttled.
 */
export function RestTimerBar() {
  const theme = useTheme();
  const endsAt = useRestTimer((state) => state.endsAt);
  const durationS = useRestTimer((state) => state.durationS);
  const extend = useRestTimer((state) => state.extend);
  const stop = useRestTimer((state) => state.stop);

  const [remaining, setRemaining] = useState(0);
  const alerted = useRef(false);

  useEffect(() => {
    if (endsAt === null) return;

    alerted.current = false;
    setRemaining(endsAt - Date.now());

    const interval = setInterval(() => setRemaining(endsAt - Date.now()), 250);
    return () => clearInterval(interval);
  }, [endsAt]);

  useEffect(() => {
    if (endsAt === null || remaining > 0 || alerted.current) return;

    // Fires once: the bar stays up afterwards so an overrun is visible.
    alerted.current = true;
    Vibration.vibrate(400);
  }, [endsAt, remaining]);

  if (endsAt === null) return null;

  const over = remaining <= 0;
  const progress = durationS > 0 ? Math.min(1, Math.max(0, remaining / (durationS * 1000))) : 0;

  return (
    <View style={[styles.bar, { backgroundColor: theme.backgroundElement }]}>
      <View
        style={[
          styles.progress,
          { backgroundColor: over ? theme.success : theme.accent, width: `${progress * 100}%` },
        ]}
      />

      <View style={styles.content}>
        <Ionicons
          name={over ? 'checkmark-circle' : 'timer-outline'}
          size={20}
          color={over ? theme.success : theme.text}
        />

        <ThemedText type="default" style={styles.time}>
          {over ? 'Descanso terminado' : formatDuration(remaining)}
        </ThemedText>

        <Pressable onPress={() => extend(15)} hitSlop={6} style={styles.action}>
          <ThemedText type="small" style={{ color: theme.accentText, fontWeight: '700' }}>
            +15 s
          </ThemedText>
        </Pressable>

        <Pressable onPress={stop} hitSlop={6} style={styles.action}>
          <ThemedText type="small" style={{ color: theme.textSecondary, fontWeight: '700' }}>
            Saltar
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { marginHorizontal: 12, marginBottom: 12, borderRadius: 12, overflow: 'hidden' },
  progress: { position: 'absolute', top: 0, bottom: 0, left: 0, opacity: 0.25 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  time: { flex: 1, fontWeight: '700' },
  action: { paddingHorizontal: 6 },
});
