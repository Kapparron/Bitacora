import { and, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { newId } from '@/db/ids';
import { events, notes, taskChecks, tasks } from '@/db/schema';
import type { Schedule } from '@/features/routines/schedule';

import { noteText } from './markdown';

const touch = () => ({ updatedAt: Date.now() });

/* -------------------------------------------------------------------- notes */

/** An empty note, opened straight away for writing. */
export async function createNote(): Promise<string> {
  const id = newId();
  await db.insert(notes).values({ id });
  return id;
}

export async function updateNote(
  noteId: string,
  patch: Partial<{ title: string; body: string }>
): Promise<void> {
  await db.update(notes).set({ ...patch, ...touch() }).where(eq(notes.id, noteId));
}

/** Hard delete: nothing points at a note. */
export async function deleteNote(noteId: string): Promise<void> {
  await db.delete(notes).where(eq(notes.id, noteId));
}

/**
 * Drops a note left with nothing in it, the way a notes app does when one is
 * opened and closed without writing. True when it was dropped.
 */
export async function discardNoteIfEmpty(noteId: string): Promise<boolean> {
  const [note] = await db.select().from(notes).where(eq(notes.id, noteId));
  // Marks alone, such as an empty "- [ ] ", are nothing written.
  if (!note || note.title.trim() !== '' || noteText(note.body) !== '') return false;

  await deleteNote(noteId);
  return true;
}

/* -------------------------------------------------------------------- tasks */

/** The four schedule columns a task shares with a routine. */
function scheduleColumns(schedule: Schedule) {
  return {
    scheduleType: schedule.type,
    scheduleWeekdays: schedule.type === 'weekdays' ? schedule.weekdays : null,
    scheduleIntervalDays: schedule.type === 'interval' ? schedule.everyDays : null,
    scheduleAnchor: schedule.type === 'interval' ? schedule.anchor : null,
  };
}

/**
 * A task from `date` on, normally today: once, or on the days its schedule
 * says. Blank text is ignored.
 */
export async function addTask(text: string, date: string, schedule: Schedule): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  await db.insert(tasks).values({ id: newId(), date, text: trimmed, ...scheduleColumns(schedule) });
}

export async function updateTask(taskId: string, text: string, schedule: Schedule): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  await db
    .update(tasks)
    .set({ text: trimmed, ...scheduleColumns(schedule), ...touch() })
    .where(eq(tasks.id, taskId));
}

/**
 * Ticks a task off for today, or back on.
 *
 * A repeating task is ticked for today alone, in task_checks. A one-off task
 * carried over from an earlier day moves to `today` when ticked: it was done
 * today, and it stays in today's list, crossed out, where a wrong tick can still
 * be taken back.
 */
export async function setTaskDone(
  task: { id: string; repeats: boolean },
  done: boolean,
  today: string
): Promise<void> {
  if (task.repeats) {
    if (done) {
      await db.insert(taskChecks).values({ taskId: task.id, date: today }).onConflictDoNothing();
    } else {
      await db
        .delete(taskChecks)
        .where(and(eq(taskChecks.taskId, task.id), eq(taskChecks.date, today)));
    }
    return;
  }

  await db
    .update(tasks)
    .set({ done, ...(done ? { date: today } : {}), ...touch() })
    .where(eq(tasks.id, task.id));
}

/** Hard delete, the days it was ticked included. */
export async function deleteTask(taskId: string): Promise<void> {
  await db.delete(tasks).where(eq(tasks.id, taskId));
}

/* ------------------------------------------------------------------- events */

export type EventInput = {
  /** `YYYY-MM-DD`. */
  date: string;
  /** `HH:MM`, or null for the whole day. */
  time: string | null;
  title: string;
  notes?: string | null;
};

export async function addEvent(input: EventInput): Promise<string> {
  const id = newId();
  await db.insert(events).values({
    id,
    date: input.date,
    time: input.time,
    title: input.title.trim() || 'Evento',
    notes: input.notes ?? null,
  });

  return id;
}

export async function updateEvent(eventId: string, patch: Partial<EventInput>): Promise<void> {
  await db
    .update(events)
    .set({ ...patch, ...(patch.title !== undefined ? { title: patch.title.trim() || 'Evento' } : {}), ...touch() })
    .where(eq(events.id, eventId));
}

/** Hard delete: nothing points at an event. */
export async function deleteEvent(eventId: string): Promise<void> {
  await db.delete(events).where(eq(events.id, eventId));
}
