import { shiftIsoDay } from '@/lib/format';

/**
 * Figures behind the totals card. Pure functions over the day sets the queries
 * already return, so nothing here needs its own SQL or its own refresh.
 *
 * Days are `YYYY-MM-DD` local calendar days, as everywhere else in the app.
 */

/**
 * Days in a row ending today, or ending yesterday when today has nothing yet: a
 * streak should not read as broken at breakfast because the day is young.
 */
export function currentStreak(days: ReadonlySet<string>, today: string): number {
  let cursor = days.has(today) ? today : shiftIsoDay(today, -1);
  if (!days.has(cursor)) return 0;

  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = shiftIsoDay(cursor, -1);
  }

  return streak;
}

/**
 * Mean of the days that carry a value inside the window ending today. Days with
 * nothing logged are left out rather than counted as zero: they say the diary
 * was not filled in, not that nothing was eaten.
 *
 * Returns null when the window holds no records.
 */
export function averagePerLoggedDay(
  byDay: ReadonlyMap<string, number>,
  today: string,
  windowDays: number
): { average: number; days: number } | null {
  let total = 0;
  let days = 0;

  for (let back = 0; back < windowDays; back += 1) {
    const value = byDay.get(shiftIsoDay(today, -back));
    if (value === undefined) continue;

    total += value;
    days += 1;
  }

  return days === 0 ? null : { average: total / days, days };
}

/** `YYYY-MM` of a calendar day. */
export function monthOf(day: string): string {
  return day.slice(0, 7);
}

export function countInMonth(days: Iterable<string>, month: string): number {
  let count = 0;
  for (const day of days) if (monthOf(day) === month) count += 1;
  return count;
}

export function sumInMonth(byDay: ReadonlyMap<string, number>, month: string): number {
  let total = 0;
  for (const [day, value] of byDay) if (monthOf(day) === month) total += value;
  return total;
}
