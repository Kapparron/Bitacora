import { isScheduledOn, weekdayIndex } from '@/features/routines/schedule';

/**
 * Which days are rest, and what that does to a streak.
 *
 * Rest comes from two places: a repeating rule, and days marked by hand, which
 * is how an odd week is handled without changing the rule.
 *
 * The rule is one of two, never both at once: the same weekdays every week, or
 * one rest every N days counted from a start day. The second is what a rotation
 * like "two on, one off" needs, since it drifts through the week.
 */
export type RestPlan = {
  /** 0 = Monday, as in the calendar grid. Ignored while `cycle` is set. */
  weekdays: ReadonlySet<number>;
  /** One rest every `everyDays` days from `anchor`, when set. */
  cycle: RestCycle | null;
  /** Days marked by hand, as `YYYY-MM-DD`. */
  days: ReadonlySet<string>;
};

export type RestCycle = {
  everyDays: number;
  /** First rest day of the cycle, as `YYYY-MM-DD`. Nothing before it rests. */
  anchor: string;
};

export const EMPTY_REST: RestPlan = { weekdays: new Set(), cycle: null, days: new Set() };

export function isRestDay(plan: RestPlan, day: string): boolean {
  if (plan.days.has(day)) return true;

  if (plan.cycle) {
    return isScheduledOn({ type: 'interval', ...plan.cycle }, day);
  }

  const [year, month, date] = day.split('-').map(Number);
  return plan.weekdays.has(weekdayIndex(new Date(year, month - 1, date)));
}

/**
 * Rest days in a row that a streak survives. Two in a row is a break: one day
 * off is part of training, two is a stop.
 */
export const MAX_REST_RUN = 1;

/** How the weekly rest days are stored in `settings`. */
export const REST_WEEKDAYS_KEY = 'rest_weekdays';

/** How the rest cycle is stored in `settings`. Absent means the weekdays rule. */
export const REST_CYCLE_KEY = 'rest_cycle';

/**
 * Cycle lengths offered. A cycle of 1 would make every day rest, which
 * `MAX_REST_RUN` turns into a streak that can never grow.
 */
export const REST_CYCLE_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 10, 14];

export function parseRestWeekdays(value: string | null): Set<number> {
  if (!value) return new Set();

  return new Set(
    value
      .split(',')
      .map((part) => Number(part.trim()))
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
  );
}

export function serializeRestWeekdays(weekdays: Iterable<number>): string {
  return [...new Set(weekdays)].sort((a, b) => a - b).join(',');
}

/** Stored as `3@2026-09-15`. Anything else reads as no cycle. */
export function parseRestCycle(value: string | null): RestCycle | null {
  const match = /^(\d+)@(\d{4}-\d{2}-\d{2})$/.exec(value?.trim() ?? '');
  if (!match) return null;

  const everyDays = Number(match[1]);
  if (everyDays < 2) return null;

  return { everyDays, anchor: match[2] };
}

export function serializeRestCycle(cycle: RestCycle): string {
  return `${cycle.everyDays}@${cycle.anchor}`;
}
