import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { OptionSheet, type SheetOption } from '@/components/option-sheet';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { toIsoDay } from '@/lib/format';
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
            <Pressable
              onPress={() => setIntervalSheet(true)}
              style={[styles.interval, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="default">
                {draft.everyDays === 1 ? 'Todos los dias' : `Cada ${draft.everyDays} dias`}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Empieza el {draft.anchor}
              </ThemedText>
            </Pressable>
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}

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
  interval: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 2 },
  actions: { flexDirection: 'row', gap: 8, paddingTop: 6 },
  action: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  actionLabel: { fontWeight: '600' },
  pressed: { opacity: 0.6 },
});
