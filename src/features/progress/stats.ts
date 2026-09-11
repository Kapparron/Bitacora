import { shiftIsoDay } from '@/lib/format';

/**
 * Figures behind the stats card. Pure functions over the day sets the queries
 * already return, so nothing here needs its own SQL or its own refresh.
 *
 * Days are `YYYY-MM-DD` local calendar days and months are `YYYY-MM`, as
 * everywhere else in the app.
 */

/**
 * Days in a row ending today, or ending yesterday when today has nothing yet: a
 * streak should not read as broken at breakfast because the day is young.
 *
 * The run is followed past the start of the month, since that is where it
 * actually started.
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
 * The longest run of consecutive days inside one month. Runs are cut at the
 * month's edges: this answers what that month looked like, not what a streak
 * passing through it reached.
 */
export function longestStreakInMonth(days: ReadonlySet<string>, month: string): number {
  const inMonth = [...days].filter((day) => monthOf(day) === month).sort();

  let longest = 0;
  let run = 0;
  let previous: string | null = null;

  for (const day of inMonth) {
    run = previous !== null && shiftIsoDay(previous, 1) === day ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }

  return longest;
}

/**
 * Mean of the days of a month that carry a value. Days with nothing logged are
 * left out rather than counted as zero: they say the diary was not filled in,
 * not that nothing was eaten.
 *
 * Returns null when the month holds no records.
 */
export function averageInMonth(byDay: ReadonlyMap<string, number>, month: string): number | null {
  let total = 0;
  let days = 0;

  for (const [day, value] of byDay) {
    if (monthOf(day) !== month) continue;

    total += value;
    days += 1;
  }

  return days === 0 ? null : total / days;
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
