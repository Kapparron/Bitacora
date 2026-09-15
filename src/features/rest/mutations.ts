import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { restDays } from '@/db/schema';
import { deleteSetting, writeSetting } from '@/db/settings';
import {
  REST_CYCLE_KEY,
  REST_WEEKDAYS_KEY,
  serializeRestCycle,
  serializeRestWeekdays,
  type RestCycle,
} from '@/features/rest/rest';

/** Replaces the weekdays kept for rest. An empty set clears them. */
export async function setRestWeekdays(weekdays: Iterable<number>): Promise<void> {
  await writeSetting(REST_WEEKDAYS_KEY, serializeRestWeekdays(weekdays));
}

/**
 * Switches rest to a cycle, or back to the weekdays with null. The weekdays are
 * left stored either way, so going back to them finds them as they were.
 */
export async function setRestCycle(cycle: RestCycle | null): Promise<void> {
  if (!cycle) {
    await deleteSetting(REST_CYCLE_KEY);
    return;
  }

  await writeSetting(REST_CYCLE_KEY, serializeRestCycle(cycle));
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
