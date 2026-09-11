import { isRestDay, MAX_REST_RUN, type RestPlan } from '@/features/rest/rest';
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
 * Rest days neither add to the streak nor end it, up to `MAX_REST_RUN` in a row:
 * one day off is part of training, two in a row is a stop. Only days with
 * something logged are counted, so a streak is still a count of real days.
 *
 * The run is followed past the start of the month, since that is where it
 * actually started.
 */
export function currentStreak(
  days: ReadonlySet<string>,
  today: string,
  rest: RestPlan | null = null
): number {
  const resting = (day: string) => rest !== null && !days.has(day) && isRestDay(rest, day);

  // A day that is neither logged nor rest only breaks the streak once it is
  // over, so an empty today is stepped over.
  let cursor = days.has(today) || resting(today) ? today : shiftIsoDay(today, -1);

  let streak = 0;
  let restRun = 0;

  while (true) {
    if (days.has(cursor)) {
      streak += 1;
      restRun = 0;
    } else if (resting(cursor)) {
      restRun += 1;
      if (restRun > MAX_REST_RUN) break;
    } else {
      break;
    }

    cursor = shiftIsoDay(cursor, -1);
  }

  return streak;
}

/**
 * The longest run inside one month, under the same rest rule as the running
 * streak. Runs are cut at the month's edges: this answers what that month looked
 * like, not what a streak passing through it reached.
 */
export function longestStreakInMonth(
  days: ReadonlySet<string>,
  month: string,
  rest: RestPlan | null = null
): number {
  const [year, monthNumber] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();

  let longest = 0;
  let run = 0;
  let restRun = 0;

  for (let date = 1; date <= daysInMonth; date += 1) {
    const day = `${month}-${String(date).padStart(2, '0')}`;

    if (days.has(day)) {
      run += 1;
      restRun = 0;
      longest = Math.max(longest, run);
    } else if (rest !== null && isRestDay(rest, day) && restRun < MAX_REST_RUN) {
      restRun += 1;
    } else {
      run = 0;
      restRun = 0;
    }
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
