import { weekdayIndex } from '@/features/routines/schedule';

/**
 * Which days are rest, and what that does to a streak.
 *
 * Rest comes from two places: the weekdays kept for rest every week, and days
 * marked by hand, which is how an odd week is handled without changing the
 * weekly rule.
 */
export type RestPlan = {
  /** 0 = Monday, as in the calendar grid. */
  weekdays: ReadonlySet<number>;
  /** Days marked by hand, as `YYYY-MM-DD`. */
  days: ReadonlySet<string>;
};

export const EMPTY_REST: RestPlan = { weekdays: new Set(), days: new Set() };

export function isRestDay(plan: RestPlan, day: string): boolean {
  if (plan.days.has(day)) return true;

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
