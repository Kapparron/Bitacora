import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { useConfirm } from '@/components/confirm-dialog';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { addTask, deleteTask, updateTask } from '@/features/agenda/mutations';
import { useTask } from '@/features/agenda/queries';
import {
  WEEKDAY_INITIALS,
  describeSchedule,
  scheduleOf,
  type Schedule,
} from '@/features/routines/schedule';
import { useTheme } from '@/hooks/use-theme';
import { toIsoDay } from '@/lib/format';

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

type Repeat = 'none' | 'daily' | 'weekdays' | 'interval';

/** Which of the form's choices a schedule reads as. */
function repeatOf(schedule: Schedule): Repeat {
  if (schedule.type === 'interval') return 'interval';
  if (schedule.type === 'weekdays') return schedule.weekdays.length === 7 ? 'daily' : 'weekdays';
  return 'none';
}

/**
 * Creates a task, or edits one when `id` is given: what it is, and whether it
 * repeats. A repeating task, "sacar al perro" every day or "kárate" on
 * Tuesdays and Thursdays, shows up on its days without being added again.
 *
 * Its schedule is a routine's (src/features/routines/schedule.ts), so a day is
 * "due" by the same rule everywhere in the app.
 */
export default function TaskScreen() {
  const theme = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = params.id ?? null;
  const { task, loading } = useTask(editingId);

  const [text, setText] = useState('');
  const [repeat, setRepeat] = useState<Repeat>('none');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  /** An interval schedule made elsewhere, kept as it is unless another is picked. */
  const [kept, setKept] = useState<Schedule | null>(null);

  // The task being edited fills the form once it has loaded.
  useEffect(() => {
    if (!task) return;
    const schedule = scheduleOf(task);
    setText(task.text);
    setRepeat(repeatOf(schedule));
    setWeekdays(schedule.type === 'weekdays' ? schedule.weekdays : []);
    setKept(schedule.type === 'interval' ? schedule : null);
  }, [task]);

  function toggleWeekday(day: number) {
    setWeekdays((current) =>
      current.includes(day) ? current.filter((one) => one !== day) : [...current, day]
    );
  }

  const schedule: Schedule =
    repeat === 'daily'
      ? { type: 'weekdays', weekdays: EVERY_DAY }
      : repeat === 'weekdays'
        ? { type: 'weekdays', weekdays }
        : repeat === 'interval' && kept
          ? kept
          : { type: 'none' };

  const ready = text.trim() !== '' && (repeat !== 'weekdays' || weekdays.length > 0);

  async function save() {
    if (!ready) return;
    if (editingId) await updateTask(editingId, text, schedule);
    else await addTask(text, toIsoDay(), schedule);
    router.back();
  }

  async function remove() {
    if (!editingId) return;
    const accepted = await confirm({
      title: 'Borrar tarea',
      message: repeat === 'none' ? text : `${text}. Deja de salir todos los días que tocaba.`,
      confirmLabel: 'Borrar',
    });
    if (!accepted) return;

    await deleteTask(editingId);
    router.back();
  }

  if (editingId && !task) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ThemedText type="default" themeColor="textSecondary">
          {loading ? 'Cargando...' : 'Esta tarea ya no existe.'}
        </ThemedText>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={editingId ? 'Editar tarea' : 'Nueva tarea'} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Label text="NOMBRE" />
        <TextInput
          value={text}
          onChangeText={setText}
          autoFocus={!editingId}
          placeholder="Sacar al perro"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
        />

        <Label text="REPETIR" />
        <View style={styles.chips}>
          <Chip label="No se repite" active={repeat === 'none'} onPress={() => setRepeat('none')} />
          <Chip label="Todos los días" active={repeat === 'daily'} onPress={() => setRepeat('daily')} />
          <Chip
            label="Algunos días"
            active={repeat === 'weekdays'}
            onPress={() => setRepeat('weekdays')}
          />
          {kept ? (
            <Chip
              label={describeSchedule(kept)}
              active={repeat === 'interval'}
              onPress={() => setRepeat('interval')}
            />
          ) : null}
        </View>

        {repeat === 'weekdays' ? (
          <View style={styles.weekdays}>
            {WEEKDAY_INITIALS.map((initial, day) => (
              <Chip
                key={initial}
                label={initial}
                active={weekdays.includes(day)}
                onPress={() => toggleWeekday(day)}
              />
            ))}
          </View>
        ) : null}

        <ThemedText type="small" themeColor="textSecondary">
          {repeat === 'none'
            ? 'Sale hoy, y si no la haces sigue saliendo los días siguientes hasta que la marques.'
            : repeat === 'weekdays' && weekdays.length === 0
              ? 'Elige qué días toca.'
              : `${describeSchedule(schedule)}. Sale esos días sin tener que añadirla, y marcarla vale solo para ese día.`}
        </ThemedText>

        <View style={styles.actions}>
          <Button
            title={editingId ? 'Guardar cambios' : 'Guardar tarea'}
            disabled={!ready}
            onPress={() => void save()}
          />
          {editingId ? (
            <Button title="Borrar tarea" variant="danger" onPress={() => void remove()} />
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
  weekdays: { flexDirection: 'row', justifyContent: 'space-between' },
  actions: { gap: 8, paddingTop: 24 },
});
