import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { useConfirm } from '@/components/confirm-dialog';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { addEvent, deleteEvent, updateEvent } from '@/features/agenda/mutations';
import { useEvent } from '@/features/agenda/queries';
import { parseTime } from '@/features/agenda/time';
import { MonthCalendar } from '@/features/calendar/month-calendar';
import { useTheme } from '@/hooks/use-theme';
import { isoDayToTimestamp, shiftIsoDay, toIsoDay } from '@/lib/format';

const NO_DAYS: ReadonlySet<string> = new Set();

/** "jueves, 1 de octubre", spelled out so there is no doubt which day it is. */
function longDay(day: string): string {
  const label = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(isoDayToTimestamp(day));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Creates an event, or edits one when `id` is given. `date` presets the day,
 * which is how the home screen opens it for the day picked on the calendar.
 *
 * Every field is laid out on its own, so it is plain what is being saved.
 */
export default function EventScreen() {
  const theme = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const editingId = params.id ?? null;
  const { event, loading } = useEvent(editingId);

  const today = toIsoDay();
  const tomorrow = shiftIsoDay(today, 1);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(params.date ?? today);
  const [timed, setTimed] = useState(false);
  const [time, setTime] = useState('');
  const [pickingDay, setPickingDay] = useState(false);
  const [month, setMonth] = useState(() => new Date(isoDayToTimestamp(params.date ?? today)));

  // The event being edited fills the form once it has loaded.
  useEffect(() => {
    if (!event) return;
    setTitle(event.title);
    setDate(event.date);
    setTimed(event.time !== null);
    setTime(event.time ?? '');
    setMonth(new Date(isoDayToTimestamp(event.date)));
  }, [event]);

  const parsedTime = timed ? parseTime(time) : null;
  const timeInvalid = timed && time.trim() !== '' && parsedTime === null;
  const ready = title.trim() !== '' && (!timed || parsedTime !== null);

  async function save() {
    if (!ready) return;
    const input = { date, time: timed ? parsedTime : null, title };

    if (editingId) await updateEvent(editingId, input);
    else await addEvent(input);

    router.back();
  }

  async function remove() {
    if (!editingId) return;
    const accepted = await confirm({
      title: 'Borrar evento',
      message: title,
      confirmLabel: 'Borrar',
    });
    if (!accepted) return;

    await deleteEvent(editingId);
    router.back();
  }

  if (editingId && !event) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ThemedText type="default" themeColor="textSecondary">
          {loading ? 'Cargando...' : 'Este evento ya no existe.'}
        </ThemedText>
      </View>
    );
  }

  const otherDay = date !== today && date !== tomorrow;

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={editingId ? 'Editar evento' : 'Nuevo evento'} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Label text="NOMBRE" />
        <TextInput
          value={title}
          onChangeText={setTitle}
          autoFocus={!editingId}
          placeholder="Dentista"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
        />

        <Label text="DÍA" />
        <View style={styles.chips}>
          <Chip
            label="Hoy"
            active={date === today}
            onPress={() => {
              setDate(today);
              setPickingDay(false);
            }}
          />
          <Chip
            label="Mañana"
            active={date === tomorrow}
            onPress={() => {
              setDate(tomorrow);
              setPickingDay(false);
            }}
          />
          <Chip label="Otro día..." active={otherDay || pickingDay} onPress={() => setPickingDay(true)} />
        </View>
        <ThemedText type="default" style={styles.chosen}>
          {longDay(date)}
        </ThemedText>

        {pickingDay ? (
          <View style={styles.calendar}>
            <MonthCalendar
              month={month}
              onMonthChange={setMonth}
              markedDays={NO_DAYS}
              selectedDay={date}
              onSelectDay={(day) => {
                if (day) setDate(day);
              }}
            />
          </View>
        ) : null}

        <Label text="HORA" />
        <View style={styles.chips}>
          <Chip label="Todo el día" active={!timed} onPress={() => setTimed(false)} />
          <Chip label="A una hora" active={timed} onPress={() => setTimed(true)} />
        </View>
        {timed ? (
          <>
            <TextInput
              value={time}
              onChangeText={setTime}
              placeholder="17:30"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numbers-and-punctuation"
              style={[styles.input, styles.time, { color: theme.text, borderColor: theme.border }]}
            />
            {timeInvalid ? (
              <ThemedText type="small" style={{ color: theme.danger }}>
                Escribe la hora como 17:30.
              </ThemedText>
            ) : null}
          </>
        ) : null}

        <View style={styles.actions}>
          <Button
            title={editingId ? 'Guardar cambios' : 'Guardar evento'}
            disabled={!ready}
            onPress={() => void save()}
          />
          {editingId ? (
            <Button title="Borrar evento" variant="danger" onPress={() => void remove()} />
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Label({ text }: { text: string }) {
  return (
    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
      {text}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 48, gap: 8 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  label: { paddingTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chosen: { fontWeight: '700' },
  // MonthCalendar draws its own side margins for the home screen.
  calendar: { marginHorizontal: -12 },
  time: { width: 120 },
  actions: { gap: 8, paddingTop: 24 },
});
