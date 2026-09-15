import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { restDays } from '@/db/schema';
import { writeSetting } from '@/db/settings';
import { REST_WEEKDAYS_KEY, serializeRestWeekdays } from '@/features/rest/rest';

/** Replaces the weekdays kept for rest. An empty set clears them. */
export async function setRestWeekdays(weekdays: Iterable<number>): Promise<void> {
  await writeSetting(REST_WEEKDAYS_KEY, serializeRestWeekdays(weekdays));
}

/**
 * Marks or unmarks one day as rest, whatever the weekly rule says. Hard delete:
 * an unmarked day is simply a day the rule decides again.
 */
export async function setRestDay(day: string, rest: boolean): Promise<void> {
  if (!rest) {
    await db.delete(restDays).where(eq(restDays.day, day));
    return;
  }

  const [existing] = await db.select().from(restDays).where(eq(restDays.day, day));
  if (existing) return;

  await db.insert(restDays).values({ day });
}
