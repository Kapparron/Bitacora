import { isScheduledOn, type Schedule } from '@/features/routines/schedule';
import { shiftIsoDay } from '@/lib/format';

/**
 * Which reminders to post, and when. Worked out here, in the app, where the
 * routines and the events are; the native side only posts each one at its time
 * (modules/workout-notifications). Pure, so the checks can hold it to its
 * examples.
 *
 * Two kinds, each with its own switch in the profile:
 *
 * - the morning one, at a time of the user's choosing: the routine due that
 *   day, unless it was already trained;
 * - events: one due at a time is reminded some minutes before, or the day
 *   before at the morning time; one for the whole day, on the morning itself.
 *
 * Plain notifications, nothing more: they are posted, and swiped away.
 */

export type ReminderSettings = {
  morning: boolean;
  /** `HH:MM`. */
  morningTime: string;
  events: boolean;
  /** Minutes before a timed event, or 'day' for the day before at the morning time. */
  eventAdvance: number | 'day';
};

export const DEFAULT_REMINDERS: ReminderSettings = {
  morning: true,
  morningTime: '09:00',
  events: true,
  eventAdvance: 60,
};

export const EVENT_ADVANCES: { value: number | 'day'; label: string }[] = [
  { value: 15, label: '15 minutos antes' },
  { value: 30, label: '30 minutos antes' },
  { value: 60, label: '1 hora antes' },
  { value: 120, label: '2 horas antes' },
  { value: 'day', label: 'El día antes' },
];

/** Keys in the settings table. An absent key means the default. */
export const REMINDER_KEYS = {
  morning: 'reminders_morning',
  morningTime: 'reminders_morning_time',
  events: 'reminders_events',
  eventAdvance: 'reminders_event_advance',
} as const;

/** The stored values, as text, read back into settings. Anything unreadable is the default. */
export function parseReminderSettings(stored: Partial<Record<keyof ReminderSettings, string | null>>): ReminderSettings {
  const advance = stored.eventAdvance;
  const minutes = Number(advance);

  return {
    morning: stored.morning !== 'off',
    morningTime: /^\d{2}:\d{2}$/.test(stored.morningTime ?? '')
      ? (stored.morningTime as string)
      : DEFAULT_REMINDERS.morningTime,
    events: stored.events !== 'off',
    eventAdvance:
      advance === 'day'
        ? 'day'
        : EVENT_ADVANCES.some((option) => option.value === minutes)
          ? minutes
          : DEFAULT_REMINDERS.eventAdvance,
  };
}

export type Reminder = {
  /** Stable, so the same reminder planned twice is scheduled once. */
  id: string;
  /** Epoch milliseconds. */
  at: number;
  title: string;
  text: string;
  /** Where tapping it opens the app. */
  path: 'routine' | 'agenda';
};

export type PlanInput = {
  now: number;
  /** `YYYY-MM-DD` of `now`. */
  today: string;
  settings: ReminderSettings;
  routines: readonly { name: string; schedule: Schedule }[];
  /** Whether a session was already finished today. */
  trainedToday: boolean;
  /** Events from today on. */
  events: readonly { id: string; date: string; time: string | null; title: string }[];
  /** How many days ahead to plan. The app plans again whenever it is opened. */
  days?: number;
};

/** A local day and a `HH:MM` time, as epoch milliseconds. */
export function dayAt(day: string, time: string): number {
  const [year, month, date] = day.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(year, month - 1, date, hours, minutes).getTime();
}

/** "Empuje A", "Empuje A y Pierna", "Empuje A, Pierna y Tirón". */
function joinNames(names: string[]): string {
  return names.length <= 1
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

export function planReminders({
  now,
  today,
  settings,
  routines,
  trainedToday,
  events,
  days = 14,
}: PlanInput): Reminder[] {
  const reminders: Reminder[] = [];
  const last = shiftIsoDay(today, days - 1);

  for (let index = 0; index < days; index++) {
    const day = shiftIsoDay(today, index);
    const morning = dayAt(day, settings.morningTime);
    if (morning <= now) continue;

    if (settings.morning && !(day === today && trainedToday)) {
      const due = routines.filter((routine) => isScheduledOn(routine.schedule, day));
      if (due.length > 0) {
        reminders.push({
          id: `routine:${day}`,
          at: morning,
          title: `Hoy toca ${joinNames(due.map((routine) => routine.name))}`,
          text: 'Abre Bitácora para empezar el entreno.',
          path: 'routine',
        });
      }
    }
  }

  if (settings.events) {
    for (const event of events) {
      if (event.date < today || event.date > last) continue;

      const at =
        event.time === null
          ? dayAt(event.date, settings.morningTime)
          : settings.eventAdvance === 'day'
            ? dayAt(shiftIsoDay(event.date, -1), settings.morningTime)
            : dayAt(event.date, event.time) - settings.eventAdvance * 60_000;
      if (at <= now) continue;

      const sameDay = event.time === null || settings.eventAdvance !== 'day';
      reminders.push({
        id: `event:${event.id}`,
        at,
        title: event.title,
        text:
          event.time === null
            ? 'Hoy, todo el día'
            : `${sameDay ? 'Hoy' : 'Mañana'} a las ${event.time}`,
        path: 'agenda',
      });
    }
  }

  return reminders.sort((a, b) => a.at - b.at);
}
