import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { OptionSheet } from '@/components/option-sheet';
import { TextPrompt } from '@/components/text-prompt';
import { ThemedText } from '@/components/themed-text';
import { parseTime } from '@/features/agenda/time';
import { useTheme } from '@/hooks/use-theme';

import { EVENT_ADVANCES } from '../plan';
import { saveReminderSetting, useReminderSettings } from '../settings';

/**
 * The reminders, in the profile: the morning one with its time, and the events
 * with how far ahead. Plain notifications, each kind with its own switch.
 */
export function RemindersCard() {
  const theme = useTheme();
  const { settings } = useReminderSettings();
  const [editingTime, setEditingTime] = useState(false);
  const [pickingAdvance, setPickingAdvance] = useState(false);

  const advanceLabel =
    EVENT_ADVANCES.find((option) => option.value === settings.eventAdvance)?.label ?? '';

  return (
    <View style={[styles.card, { borderColor: theme.border }]}>
      <ThemedText type="small" themeColor="textSecondary">
        RECORDATORIOS
      </ThemedText>

      <SwitchRow
        title="Rutina del día"
        hint="Un aviso por la mañana si toca entrenar y aún no lo has hecho"
        value={settings.morning}
        onChange={(value) => void saveReminderSetting('morning', value)}
      />

      <SwitchRow
        title="Eventos"
        hint="Un aviso antes de cada evento de la agenda"
        value={settings.events}
        onChange={(value) => void saveReminderSetting('events', value)}
      />

      <View style={styles.fields}>
        <Field
          label="AVISO DE LA MAÑANA"
          value={settings.morningTime}
          disabled={!settings.morning && !settings.events}
          onPress={() => setEditingTime(true)}
        />
        <Field
          label="ANTES DE UN EVENTO"
          value={advanceLabel}
          disabled={!settings.events}
          onPress={() => setPickingAdvance(true)}
        />
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        Son notificaciones normales, que se quitan deslizando. Los eventos de todo el día avisan a
        la hora del aviso de la mañana.
      </ThemedText>

      {editingTime ? (
        <TextPrompt
          title="Hora del aviso de la mañana"
          initialValue={settings.morningTime}
          placeholder="09:00"
          keyboardType="numbers-and-punctuation"
          onCancel={() => setEditingTime(false)}
          onSubmit={(text) => {
            setEditingTime(false);
            const time = parseTime(text);
            if (time) void saveReminderSetting('morningTime', time);
          }}
        />
      ) : null}

      {pickingAdvance ? (
        <OptionSheet
          title="Cuánto antes avisar de un evento"
          options={EVENT_ADVANCES}
          current={settings.eventAdvance}
          onSelect={(value) => {
            setPickingAdvance(false);
            void saveReminderSetting('eventAdvance', value);
          }}
          onClose={() => setPickingAdvance(false)}
        />
      ) : null}
    </View>
  );
}

function SwitchRow({
  title,
  hint,
  value,
  onChange,
}: {
  title: string;
  hint: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <ThemedText type="default" style={styles.rowTitle}>
          {title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
        thumbColor={theme.background}
      />
    </View>
  );
}

function Field({
  label,
  value,
  disabled,
  onPress,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.field,
        { backgroundColor: theme.backgroundElement },
        (pressed || disabled) && { opacity: disabled ? 0.4 : 0.6 },
      ]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="default">{value}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontWeight: '700' },
  fields: { flexDirection: 'row', gap: 8 },
  field: { flex: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 2 },
});
