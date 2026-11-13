import { and, asc, desc, eq, gte, isNull, lt, lte, ne, or, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { useLiveTables } from '@/db/live';
import {
  events,
  notes,
  taskChecks,
  tasks,
  type CalendarEvent,
  type Note,
  type Task,
} from '@/db/schema';
import { isScheduledOn, scheduleOf } from '@/features/routines/schedule';

// What a hook returns before its first result: the same object every time.
const NO_NOTES: Note[] = [];
const NO_EVENTS: CalendarEvent[] = [];
const NO_DAYS = new Set<string>();

/* -------------------------------------------------------------------- notes */

/** Every note, last edited first. */
export function loadNotes(): Promise<Note[]> {
  return db.select().from(notes).where(isNull(notes.deletedAt)).orderBy(desc(notes.updatedAt));
}

export function useNotes(): { notes: Note[]; loading: boolean } {
  const { data, loading } = useLiveTables('useNotes', ['notes'], loadNotes, []);
  return { notes: data ?? NO_NOTES, loading };
}

export async function loadNote(noteId: string): Promise<Note | null> {
  const [note] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, noteId), isNull(notes.deletedAt)));
  return note ?? null;
}

export function useNote(noteId: string): { note: Note | null; loading: boolean } {
  const { data, loading } = useLiveTables('useNote', ['notes'], () => loadNote(noteId), [noteId]);
  return { note: data ?? null, loading };
}

/* -------------------------------------------------------------------- tasks */

/** A task as today's list shows it. */
export type TodayTask = Task & {
  /** Whether it repeats; a repeating task is ticked off for today only. */
  repeats: boolean;
  /** Ticked off today, for a repeating task; its own `done` for a one-off. */
  doneToday: boolean;
};

const NO_TASKS: TodayTask[] = [];

/**
 * Today's tasks, in three groups:
 *
 * - one-off tasks left undone on earlier days, which carry on until ticked off,
 *   oldest first;
 * - repeating tasks that fall on today, ticked off or not;
 * - one-off tasks set for today, done or not, in the order they were added.
 *
 * A repeating task missed on an earlier day does not carry over: walking the
 * dog yesterday is not something to do today.
 */
export async function loadTodayTasks(today: string): Promise<TodayTask[]> {
  const oneOff = await db
    .select()
    .from(tasks)
    .where(
      and(
        isNull(tasks.deletedAt),
        eq(tasks.scheduleType, 'none'),
        or(eq(tasks.date, today), and(lt(tasks.date, today), eq(tasks.done, false)))
      )
    )
    .orderBy(asc(tasks.date), asc(tasks.createdAt));

  const repeating = await db
    .select({ task: tasks, checked: taskChecks.date })
    .from(tasks)
    .leftJoin(taskChecks, and(eq(taskChecks.taskId, tasks.id), eq(taskChecks.date, today)))
    .where(and(isNull(tasks.deletedAt), ne(tasks.scheduleType, 'none'), lte(tasks.date, today)))
    .orderBy(asc(tasks.createdAt));

  const carried = oneOff.filter((task) => task.date < today);
  const own = oneOff.filter((task) => task.date === today);

  return [
    ...carried.map((task) => ({ ...task, repeats: false, doneToday: task.done })),
    ...repeating
      .filter(({ task }) => isScheduledOn(scheduleOf(task), today))
      .map(({ task, checked }) => ({ ...task, repeats: true, doneToday: checked !== null })),
    ...own.map((task) => ({ ...task, repeats: false, doneToday: task.done })),
  ];
}

export function useTodayTasks(today: string): TodayTask[] {
  const { data } = useLiveTables(
    'useTodayTasks',
    ['tasks', 'task_checks'],
    () => loadTodayTasks(today),
    [today]
  );
  return data ?? NO_TASKS;
}

/** One task, for the form that edits it. */
export function useTask(taskId: string | null): { task: Task | null; loading: boolean } {
  const { data, loading } = useLiveTables(
    'useTask',
    ['tasks'],
    async () => {
      if (taskId === null) return null;
      const [found] = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)));
      return found ?? null;
    },
    [taskId]
  );
  return { task: data ?? null, loading: taskId !== null && loading };
}

/* ------------------------------------------------------------------- events */

/** Whole-day events first, then by time. */
const BY_TIME = [sql`${events.time} is not null`, asc(events.time), asc(events.createdAt)];

/** One event, for the form that edits it. */
export function useEvent(eventId: string | null): { event: CalendarEvent | null; loading: boolean } {
  const { data, loading } = useLiveTables(
    'useEvent',
    ['events'],
    async () => {
      if (eventId === null) return null;
      const [found] = await db
        .select()
        .from(events)
        .where(and(eq(events.id, eventId), isNull(events.deletedAt)));
      return found ?? null;
    },
    [eventId]
  );
  return { event: data ?? null, loading: eventId !== null && loading };
}

/** Events from `today` on, soonest first. */
export function loadUpcomingEvents(today: string): Promise<CalendarEvent[]> {
  return db
    .select()
    .from(events)
    .where(and(gte(events.date, today), isNull(events.deletedAt)))
    .orderBy(asc(events.date), ...BY_TIME);
}

export function useUpcomingEvents(today: string): CalendarEvent[] {
  const { data } = useLiveTables(
    'useUpcomingEvents',
    ['events'],
    () => loadUpcomingEvents(today),
    [today]
  );
  return data ?? NO_EVENTS;
}

/** Events from `from` to `to`, both included, soonest first. */
export function loadEventsBetween(from: string, to: string): Promise<CalendarEvent[]> {
  return db
    .select()
    .from(events)
    .where(and(gte(events.date, from), lte(events.date, to), isNull(events.deletedAt)))
    .orderBy(asc(events.date), ...BY_TIME);
}

export function useEventsBetween(from: string, to: string): CalendarEvent[] {
  const { data } = useLiveTables(
    'useEventsBetween',
    ['events'],
    () => loadEventsBetween(from, to),
    [from, to]
  );
  return data ?? NO_EVENTS;
}

/** The events of one day, for the day summary under the calendar. */
export function loadDayEvents(day: string): Promise<CalendarEvent[]> {
  return db
    .select()
    .from(events)
    .where(and(eq(events.date, day), isNull(events.deletedAt)))
    .orderBy(...BY_TIME);
}

export function useDayEvents(day: string): CalendarEvent[] {
  const { data } = useLiveTables('useDayEvents', ['events'], () => loadDayEvents(day), [day]);
  return data ?? NO_EVENTS;
}

/** Days that hold at least one event, for marking the calendar. */
export function useEventDays(): Set<string> {
  const { data } = useLiveTables(
    'useEventDays',
    ['events'],
    async () => {
      const rows = await db
        .selectDistinct({ date: events.date })
        .from(events)
        .where(isNull(events.deletedAt));
      return new Set(rows.map((row) => row.date));
    },
    []
  );
  return data ?? NO_DAYS;
}
