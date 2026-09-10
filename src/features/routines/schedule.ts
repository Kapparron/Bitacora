import type { Routine } from '@/db/schema';

/**
 * When a routine comes round again.
 *
 * - `weekdays` pins it to days of the week: leg day every Monday and Thursday.
 * - `interval` repeats it every N days from an anchor date, which is what a
 *   rotation like "push, pull, legs, rest" needs — it drifts through the week
 *   instead of sticking to it.
 */
export type Schedule =
  | { type: 'none' }
  | { type: 'weekdays'; weekdays: number[] }
  | { type: 'interval'; everyDays: number; anchor: string };

/** 0 = Monday, matching the calendar grid rather than JavaScript's Sunday-first. */
export const WEEKDAY_INITIALS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const WEEKDAY_NAMES = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
];

export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/**
 * Days between two `YYYY-MM-DD` days, counted in UTC so a daylight-saving
 * change in the middle cannot turn 3 days into 2.9 and round the wrong way.
 */
function daysBetween(from: string, to: string): number {
  const parse = (day: string) => {
    const [year, month, date] = day.split('-').map(Number);
    return Date.UTC(year, month - 1, date);
  };

  return Math.round((parse(to) - parse(from)) / 86_400_000);
}

/** Just the scheduling columns, so both the row and its list summary fit. */
export type Schedulable = Pick<
  Routine,
  'scheduleType' | 'scheduleWeekdays' | 'scheduleIntervalDays' | 'scheduleAnchor'
>;

export function scheduleOf(routine: Schedulable): Schedule {
  if (routine.scheduleType === 'weekdays') {
    return { type: 'weekdays', weekdays: routine.scheduleWeekdays ?? [] };
  }

  if (routine.scheduleType === 'interval' && routine.scheduleIntervalDays && routine.scheduleAnchor) {
    return {
      type: 'interval',
      everyDays: routine.scheduleIntervalDays,
      anchor: routine.scheduleAnchor,
    };
  }

  return { type: 'none' };
}

/** Whether the routine falls on `isoDay`, a `YYYY-MM-DD` local calendar day. */
export function isScheduledOn(schedule: Schedule, isoDay: string): boolean {
  switch (schedule.type) {
    case 'weekdays': {
      const [year, month, date] = isoDay.split('-').map(Number);
      return schedule.weekdays.includes(weekdayIndex(new Date(year, month - 1, date)));
    }

    case 'interval': {
      const elapsed = daysBetween(schedule.anchor, isoDay);
      // Nothing is scheduled before the anchor: the rotation starts there.
      return elapsed >= 0 && elapsed % schedule.everyDays === 0;
    }

    default:
      return false;
  }
}

/** One line for the routine list and the editor, e.g. "Lunes y jueves". */
export function describeSchedule(schedule: Schedule): string {
  switch (schedule.type) {
    case 'weekdays': {
      if (schedule.weekdays.length === 0) return 'Sin dias elegidos';
      if (schedule.weekdays.length === 7) return 'Todos los dias';

      const names = [...schedule.weekdays].sort((a, b) => a - b).map((day) => WEEKDAY_NAMES[day]);
      const label =
        names.length === 1
          ? names[0]
          : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;

      return label.charAt(0).toUpperCase() + label.slice(1);
    }

    case 'interval':
      return schedule.everyDays === 1 ? 'Todos los dias' : `Cada ${schedule.everyDays} dias`;

    default:
      return 'Sin programar';
  }
}
