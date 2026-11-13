import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OptionSheet } from '@/components/option-sheet';
import { ThemedText } from '@/components/themed-text';
import type { CalendarEvent, Note } from '@/db/schema';
import { EventRow } from '@/features/agenda/components/event-row';
import { ItemActionsSheet } from '@/features/agenda/components/item-actions-sheet';
import { TaskRow } from '@/features/agenda/components/task-row';
import { noteTasks, noteText } from '@/features/agenda/markdown';
import { createNote, deleteNote } from '@/features/agenda/mutations';
import {
  useEventsBetween,
  useNotes,
  useTodayTasks,
  useUpcomingEvents,
} from '@/features/agenda/queries';
import { useActiveWorkout } from '@/features/workout/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, isoDayToTimestamp, mondayOf, shiftIsoDay, toIsoDay } from '@/lib/format';

type AddChoice = 'task' | 'note' | 'event' | null;

/**
 * What is not training or eating but still shapes the week: today's tasks,
 * events such as a visit to the dentist, which also mark the calendar on the
 * home screen, and notes, which can carry things to tick off such as the
 * shopping.
 *
 * The tasks are today's, with the ones left undone before carried over; the
 * events are this week's, Monday to Sunday, with a link to all that is coming;
 * the notes are all of them, last edited first. The green button adds any of
 * the three.
 */
export default function AgendaScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { contents: active } = useActiveWorkout();

  const today = toIsoDay();
  const monday = mondayOf(today);
  const sunday = shiftIsoDay(monday, 6);

  const [allEvents, setAllEvents] = useState(false);
  const [adding, setAdding] = useState(false);

  const todayTasks = useTodayTasks(today);
  const weekEvents = useEventsBetween(monday, sunday);
  const upcoming = useUpcomingEvents(today);
  const { notes } = useNotes();

  const shownEvents = allEvents ? upcoming : weekEvents;

  async function add(choice: AddChoice) {
    setAdding(false);
    if (choice === 'task') router.push('/task');
    if (choice === 'event') router.push('/event');
    if (choice === 'note') router.push(`/note/${await createNote()}`);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">Agenda</ThemedText>

        <SectionTitle title="TAREAS DE HOY" />

        {todayTasks.map((task) => (
          <TaskRow key={task.id} task={task} today={today} />
        ))}

        <SectionTitle
          title={allEvents ? 'PRÓXIMOS EVENTOS' : 'EVENTOS DE ESTA SEMANA'}
          toggle={allEvents ? 'Solo esta semana' : 'Ver próximos'}
          onToggle={() => setAllEvents(!allEvents)}
        />

        {shownEvents.length > 0 ? <EventsByDay events={shownEvents} today={today} /> : null}

        <SectionTitle title="NOTAS" />

        {notes.length > 0 ? (
          <View style={styles.grid}>
            {notes.map((note) => (
              <NoteCard key={note.id} note={note} onPress={() => router.push(`/note/${note.id}`)} />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <Pressable
        onPress={() => setAdding(true)}
        accessibilityLabel="Añadir tarea, evento o nota"
        style={({ pressed }) => [
          styles.add,
          // Above the bar of a session in progress, which sits over the tabs.
          { backgroundColor: theme.accent, shadowColor: theme.text, bottom: active ? 88 : 20 },
          pressed && { opacity: 0.7 },
        ]}>
        <Ionicons name="add" size={30} color={theme.onAccent} />
      </Pressable>

      {adding ? (
        <OptionSheet<AddChoice>
          title="Añadir"
          options={[
            {
              value: 'task',
              label: 'Tarea',
              description: 'Algo que hacer hoy, o que se repite, como sacar al perro',
            },
            { value: 'note', label: 'Nota', description: 'Texto, enlaces y listas de tareas' },
            {
              value: 'event',
              label: 'Evento',
              description: 'Algo de un día concreto, como el dentista',
            },
          ]}
          current={null}
          onSelect={(choice) => void add(choice)}
          onClose={() => setAdding(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}

/** A section heading, with a link on the right when the section has one. */
function SectionTitle({
  title,
  toggle,
  onToggle,
}: {
  title: string;
  toggle?: string;
  onToggle?: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {title}
      </ThemedText>
      {toggle ? (
        <Pressable onPress={onToggle} hitSlop={8}>
          <ThemedText type="small" style={{ color: theme.accentText, fontWeight: '700' }}>
            {toggle}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * A note as a card: its title, the start of its text and how its tasks stand.
 * A long press offers to edit or delete it.
 */
function NoteCard({ note, onPress }: { note: Note; onPress: () => void }) {
  const theme = useTheme();
  const [menu, setMenu] = useState(false);
  const title = note.title.trim();
  const body = noteText(note.body);
  const tasks = noteTasks(note.body);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={() => setMenu(true)}
      style={({ pressed }) => [
        styles.card,
        { borderColor: theme.border },
        pressed && { backgroundColor: theme.backgroundElement },
      ]}>
      {title ? (
        <ThemedText type="default" style={styles.cardTitle} numberOfLines={2}>
          {title}
        </ThemedText>
      ) : null}
      {body ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={title ? 4 : 6}>
          {body}
        </ThemedText>
      ) : null}
      {tasks.total > 0 ? (
        <View style={styles.progress}>
          <Ionicons
            name={tasks.pending === 0 ? 'checkbox' : 'square-outline'}
            size={14}
            color={theme.accentText}
          />
          <ThemedText type="small" style={{ color: theme.accentText, fontWeight: '700' }}>
            {tasks.pending === 0 ? 'Todo hecho' : `${tasks.pending} de ${tasks.total} por hacer`}
          </ThemedText>
        </View>
      ) : null}
      {!title && !body ? (
        <ThemedText type="small" themeColor="textSecondary">
          Nota vacía
        </ThemedText>
      ) : null}

      {menu ? (
        <ItemActionsSheet
          title={title || 'Nota sin título'}
          editHint="Abrirla para escribir"
          deleteTitle="Eliminar nota"
          deleteMessage="Se borra con todo lo que tiene."
          onEdit={onPress}
          onDelete={() => deleteNote(note.id)}
          onClose={() => setMenu(false)}
        />
      ) : null}
    </Pressable>
  );
}

/** Events under a heading per day. Days already gone this week are faded. */
function EventsByDay({ events, today }: { events: CalendarEvent[]; today: string }) {
  const days: { day: string; events: CalendarEvent[] }[] = [];
  for (const event of events) {
    const last = days.at(-1);
    if (last?.day === event.date) last.events.push(event);
    else days.push({ day: event.date, events: [event] });
  }

  return (
    <View style={styles.days}>
      {days.map(({ day, events: ofDay }) => (
        <View key={day} style={day < today && styles.past}>
          <ThemedText type="smallBold">{formatDay(isoDayToTimestamp(day))}</ThemedText>
          {ofDay.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Room at the bottom so the last card is not hidden under the green button.
  content: { padding: 16, paddingBottom: 120, gap: 8 },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: {
    // Two to a row, with the gap between them.
    width: '48.5%',
    minHeight: 88,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  cardTitle: { fontWeight: '700' },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 'auto' },
  days: { gap: 12, paddingTop: 4 },
  past: { opacity: 0.5 },
  // The same round green button as the one that adds an exercise.
  add: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});
