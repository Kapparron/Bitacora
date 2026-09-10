import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MonthCalendar } from '@/features/calendar/month-calendar';
import { useTheme } from '@/hooks/use-theme';
import { toIsoDay } from '@/lib/format';

const NO_DAYS: ReadonlySet<string> = new Set();

/** `HH:MM` of a timestamp, the shape the time field edits. */
function toClock(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Parses `HH:MM` or `H.MM`; null when it is not a real time of day. */
function parseClock(value: string): { hours: number; minutes: number } | null {
  const match = /^(\d{1,2})[:.]?(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return { hours, minutes };
}

/**
 * Themed date and time picker, drawn from the month grid the app already owns.
 * The platform pickers would need a native module and would ignore the theme.
 */
export function DatePrompt({
  title,
  initialValue,
  confirmLabel = 'Guardar',
  onSubmit,
  onCancel,
}: {
  title: string;
  initialValue: number;
  confirmLabel?: string;
  /** The chosen moment, as epoch milliseconds. */
  onSubmit: (timestamp: number) => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const [day, setDay] = useState(() => toIsoDay(new Date(initialValue)));
  const [month, setMonth] = useState(() => {
    const date = new Date(initialValue);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [clock, setClock] = useState(() => toClock(initialValue));

  const time = parseClock(clock);

  function submit() {
    if (!time) return;

    const [year, monthNumber, date] = day.split('-').map(Number);
    onSubmit(new Date(year, monthNumber - 1, date, time.hours, time.minutes).getTime());
  }

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        {/* Swallows taps on the card so they do not reach the backdrop. */}
        <Pressable
          style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}
          onPress={() => {}}>
          <ThemedText type="default" style={styles.title}>
            {title}
          </ThemedText>

          <MonthCalendar
            month={month}
            onMonthChange={setMonth}
            markedDays={NO_DAYS}
            selectedDay={day}
            // Tapping the selected day again clears it in the calendar's own
            // filter sense; here a day must always stay chosen.
            onSelectDay={(next) => setDay(next ?? day)}
          />

          <View style={styles.timeRow}>
            <ThemedText type="small" themeColor="textSecondary">
              HORA
            </ThemedText>

            <TextInput
              value={clock}
              onChangeText={setClock}
              keyboardType="numbers-and-punctuation"
              placeholder="18:30"
              placeholderTextColor={theme.textSecondary}
              selectTextOnFocus
              maxLength={5}
              style={[styles.time, { backgroundColor: theme.backgroundElement, color: theme.text }]}
            />
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.action,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="default" style={styles.actionLabel}>
                Cancelar
              </ThemedText>
            </Pressable>

            <Pressable
              disabled={!time}
              onPress={submit}
              style={({ pressed }) => [
                styles.action,
                { backgroundColor: theme.accent },
                (pressed || !time) && styles.pressed,
              ]}>
              <ThemedText type="default" style={[styles.actionLabel, { color: theme.onAccent }]}>
                {confirmLabel}
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 20,
    gap: 12,
  },
  title: { fontWeight: '700', paddingHorizontal: 20 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20 },
  time: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  actions: { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
  action: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  actionLabel: { fontWeight: '600' },
  pressed: { opacity: 0.6 },
});
