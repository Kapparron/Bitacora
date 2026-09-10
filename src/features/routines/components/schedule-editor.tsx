import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { OptionSheet, type SheetOption } from '@/components/option-sheet';
import { ThemedText } from '@/components/themed-text';
import { MonthCalendar } from '@/features/calendar/month-calendar';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, toIsoDay } from '@/lib/format';
import { WEEKDAY_INITIALS, type Schedule } from '../schedule';

const INTERVAL_OPTIONS: SheetOption<number>[] = [1, 2, 3, 4, 5, 6, 7, 8, 10, 14].map((value) => ({
  value,
  label: value === 1 ? 'Todos los dias' : `Cada ${value} dias`,
}));

/**
 * Picks how a routine repeats. Render it only while it is open.
 *
 * The two modes are not interchangeable: weekdays pin a routine to the week,
 * while an interval lets a rotation drift through it. The editor keeps whichever
 * one is chosen and leaves the other's values alone.
 */
export function ScheduleEditor({
  schedule,
  onSave,
  onClose,
}: {
  schedule: Schedule;
  onSave: (schedule: Schedule) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const [draft, setDraft] = useState<Schedule>(schedule);
  const [intervalSheet, setIntervalSheet] = useState(false);
  const [anchorPicker, setAnchorPicker] = useState(false);

  function toggleWeekday(day: number) {
    setDraft((current) => {
      const weekdays = current.type === 'weekdays' ? current.weekdays : [];
      const next = weekdays.includes(day)
        ? weekdays.filter((one) => one !== day)
        : [...weekdays, day];

      return { type: 'weekdays', weekdays: next };
    });
  }

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Swallows taps on the card so they do not reach the backdrop. */}
        <Pressable
          style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}
          onPress={() => {}}>
          <ThemedText type="default" style={styles.title}>
            Cuando toca esta rutina
          </ThemedText>

          <Mode
            label="Sin programar"
            description="No aparece en el calendario"
            active={draft.type === 'none'}
            onPress={() => setDraft({ type: 'none' })}
          />

          <Mode
            label="Dias de la semana"
            description="Por ejemplo lunes y jueves"
            active={draft.type === 'weekdays'}
            onPress={() =>
              setDraft((current) =>
                current.type === 'weekdays' ? current : { type: 'weekdays', weekdays: [] }
              )
            }
          />

          {draft.type === 'weekdays' ? (
            <View style={styles.weekdays}>
              {WEEKDAY_INITIALS.map((initial, day) => {
                const active = draft.weekdays.includes(day);

                return (
                  <Pressable
                    key={day}
                    onPress={() => toggleWeekday(day)}
                    style={({ pressed }) => [
                      styles.weekday,
                      { backgroundColor: active ? theme.accent : theme.backgroundElement },
                      pressed && { opacity: 0.6 },
                    ]}>
                    <ThemedText
                      type="smallBold"
                      style={{ color: active ? theme.onAccent : theme.text }}>
                      {initial}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <Mode
            label="Cada cierto numero de dias"
            description="Para rotaciones que no siguen la semana"
            active={draft.type === 'interval'}
            onPress={() =>
              setDraft((current) =>
                current.type === 'interval'
                  ? current
                  : // The rotation counts from today unless it already had an anchor.
                    { type: 'interval', everyDays: 3, anchor: toIsoDay() }
              )
            }
          />

          {draft.type === 'interval' ? (
            <View style={styles.intervalRow}>
              <Pressable
                onPress={() => setIntervalSheet(true)}
                style={[styles.interval, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="small" themeColor="textSecondary">
                  CADA
                </ThemedText>
                <ThemedText type="default">
                  {draft.everyDays === 1 ? '1 dia' : `${draft.everyDays} dias`}
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => setAnchorPicker(true)}
                style={[styles.interval, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="small" themeColor="textSecondary">
                  EMPIEZA EL
                </ThemedText>
                <ThemedText type="default">
                  {formatDay(new Date(`${draft.anchor}T12:00:00`).getTime())}
                </ThemedText>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
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
              onPress={() => onSave(draft)}
              style={({ pressed }) => [
                styles.action,
                { backgroundColor: theme.accent },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="default" style={[styles.actionLabel, { color: theme.onAccent }]}>
                Guardar
              </ThemedText>
            </Pressable>
          </View>

          {intervalSheet && draft.type === 'interval' ? (
            <OptionSheet
              title="Cada cuantos dias"
              options={INTERVAL_OPTIONS}
              current={draft.everyDays}
              onSelect={(everyDays) => {
                setIntervalSheet(false);
                setDraft({ ...draft, everyDays });
              }}
              onClose={() => setIntervalSheet(false)}
            />
          ) : null}

          {anchorPicker && draft.type === 'interval' ? (
            <AnchorPicker
              anchor={draft.anchor}
              onSelect={(anchor) => {
                setAnchorPicker(false);
                setDraft({ ...draft, anchor });
              }}
              onClose={() => setAnchorPicker(false)}
            />
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Picks the day the rotation counts from, using the same month grid the workout
 * tab draws. A dedicated date-picker dependency would look nothing like it.
 */
function AnchorPicker({
  anchor,
  onSelect,
  onClose,
}: {
  anchor: string;
  onSelect: (day: string) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const [month, setMonth] = useState(() => {
    const [year, monthNumber] = anchor.split('-').map(Number);
    return new Date(year, monthNumber - 1, 1);
  });

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}
          onPress={() => {}}>
          <ThemedText type="default" style={styles.title}>
            Primer dia de la rotacion
          </ThemedText>

          <MonthCalendar
            month={month}
            onMonthChange={setMonth}
            markedDays={EMPTY_DAYS}
            selectedDay={anchor}
            // The grid clears the selection when the chosen day is tapped again;
            // here there is always an anchor, so that tap just confirms it.
            onSelectDay={(day) => onSelect(day ?? anchor)}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const EMPTY_DAYS: ReadonlySet<string> = new Set();

function Mode({
  label,
  description,
  active,
  onPress,
}: {
  label: string;
  description: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.mode,
        { borderColor: active ? theme.accent : theme.border },
        pressed && styles.pressed,
      ]}>
      <View style={styles.modeText}>
        <ThemedText type="default">{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {description}
        </ThemedText>
      </View>

      <View
        style={[
          styles.radio,
          { borderColor: active ? theme.accent : theme.border },
          active && { backgroundColor: theme.accent },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 10,
  },
  title: { fontWeight: '700' },
  mode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modeText: { flex: 1, gap: 2 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  weekdays: { flexDirection: 'row', gap: 6, justifyContent: 'space-between' },
  weekday: { flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  intervalRow: { flexDirection: 'row', gap: 8 },
  interval: { flex: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 2 },
  actions: { flexDirection: 'row', gap: 8, paddingTop: 6 },
  action: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  actionLabel: { fontWeight: '600' },
  pressed: { opacity: 0.6 },
});
