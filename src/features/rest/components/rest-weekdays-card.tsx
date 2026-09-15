import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { OptionSheet, type SheetOption } from '@/components/option-sheet';
import { ThemedText } from '@/components/themed-text';
import { setRestCycle, setRestWeekdays } from '@/features/rest/mutations';
import { useRestPlan } from '@/features/rest/queries';
import { REST_CYCLE_OPTIONS } from '@/features/rest/rest';
import { AnchorPicker } from '@/features/routines/components/schedule-editor';
import { WEEKDAY_INITIALS } from '@/features/routines/schedule';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, toIsoDay } from '@/lib/format';

const CYCLE_OPTIONS: SheetOption<number>[] = REST_CYCLE_OPTIONS.map((value) => ({
  value,
  label: `Cada ${value} dias`,
}));

/** Length a new cycle starts with: two days on, one off. */
const DEFAULT_CYCLE_DAYS = 3;

/**
 * The rule that decides rest days: the same weekdays every week, or one rest
 * every N days from a start day. A rest day does not add to the training
 * streak, but it does not end it either; two rest days in a row do.
 *
 * A single odd day is marked from the calendar instead, which overrides this
 * rule for that date.
 */
export function RestWeekdaysCard() {
  const theme = useTheme();
  const rest = useRestPlan();
  const [cycleSheet, setCycleSheet] = useState(false);
  const [anchorPicker, setAnchorPicker] = useState(false);

  const { cycle } = rest;

  function toggle(weekday: number) {
    const next = new Set(rest.weekdays);
    if (next.has(weekday)) next.delete(weekday);
    else next.add(weekday);

    void setRestWeekdays(next);
  }

  return (
    <View style={[styles.card, { borderColor: theme.border }]}>
      <ThemedText type="small" themeColor="textSecondary">
        DIAS DE DESCANSO
      </ThemedText>

      <View style={[styles.modes, { backgroundColor: theme.backgroundElement }]}>
        <ModeButton
          label="Dias de la semana"
          active={!cycle}
          onPress={() => void setRestCycle(null)}
        />
        <ModeButton
          label="Cada X dias"
          active={cycle !== null}
          onPress={() => {
            if (!cycle) void setRestCycle({ everyDays: DEFAULT_CYCLE_DAYS, anchor: toIsoDay() });
          }}
        />
      </View>

      {cycle ? (
        <View style={styles.cycleRow}>
          <Pressable
            onPress={() => setCycleSheet(true)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.cycleField,
              { backgroundColor: theme.backgroundElement },
              pressed && { opacity: 0.6 },
            ]}>
            <ThemedText type="small" themeColor="textSecondary">
              DESCANSO
            </ThemedText>
            <ThemedText type="default">Cada {cycle.everyDays} dias</ThemedText>
          </Pressable>

          <Pressable
            onPress={() => setAnchorPicker(true)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.cycleField,
              { backgroundColor: theme.backgroundElement },
              pressed && { opacity: 0.6 },
            ]}>
            <ThemedText type="small" themeColor="textSecondary">
              EMPIEZA EL
            </ThemedText>
            <ThemedText type="default">
              {formatDay(new Date(`${cycle.anchor}T12:00:00`).getTime())}
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <View style={styles.days}>
          {WEEKDAY_INITIALS.map((initial, weekday) => {
            const active = rest.weekdays.has(weekday);

            return (
              <Pressable
                key={weekday}
                onPress={() => toggle(weekday)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                style={({ pressed }) => [
                  styles.day,
                  { backgroundColor: active ? theme.accent : theme.backgroundElement },
                  pressed && { opacity: 0.6 },
                ]}>
                <ThemedText
                  type="small"
                  style={{ color: active ? theme.onAccent : theme.text, fontWeight: '700' }}>
                  {initial}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      )}

      <ThemedText type="small" themeColor="textSecondary">
        {cycle
          ? `El dia de inicio es descanso, y despues uno de cada ${cycle.everyDays}. `
          : ''}
        Un descanso no suma a la racha, pero tampoco la corta. Dos seguidos si. Manten pulsado un
        dia del calendario para marcarlo como descanso suelto.
      </ThemedText>

      {cycleSheet && cycle ? (
        <OptionSheet
          title="Cada cuantos dias descansas"
          options={CYCLE_OPTIONS}
          current={cycle.everyDays}
          onSelect={(everyDays) => {
            setCycleSheet(false);
            void setRestCycle({ ...cycle, everyDays });
          }}
          onClose={() => setCycleSheet(false)}
        />
      ) : null}

      {anchorPicker && cycle ? (
        <AnchorPicker
          title="Primer dia de descanso"
          anchor={cycle.anchor}
          onSelect={(anchor) => {
            setAnchorPicker(false);
            void setRestCycle({ ...cycle, anchor });
          }}
          onClose={() => setAnchorPicker(false)}
        />
      ) : null}
    </View>
  );
}

function ModeButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      style={({ pressed }) => [
        styles.mode,
        active && { backgroundColor: theme.accent },
        pressed && { opacity: 0.6 },
      ]}>
      <ThemedText
        type="small"
        style={{ color: active ? theme.onAccent : theme.text, fontWeight: '700' }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: 10 },
  modes: { flexDirection: 'row', borderRadius: 999, padding: 3 },
  mode: { flex: 1, borderRadius: 999, paddingVertical: 8, alignItems: 'center' },
  days: { flexDirection: 'row', gap: 8 },
  day: { flex: 1, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  cycleRow: { flexDirection: 'row', gap: 8 },
  cycleField: { flex: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 2 },
});
