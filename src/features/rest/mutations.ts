import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { restDays, settings } from '@/db/schema';
import { REST_WEEKDAYS_KEY, serializeRestWeekdays } from '@/features/rest/rest';

const touch = () => ({ updatedAt: Date.now() });

/** Replaces the weekdays kept for rest. An empty set clears them. */
export async function setRestWeekdays(weekdays: Iterable<number>): Promise<void> {
  const value = serializeRestWeekdays(weekdays);
  const [existing] = await db.select().from(settings).where(eq(settings.key, REST_WEEKDAYS_KEY));

  if (existing) {
    await db
      .update(settings)
      .set({ value, ...touch() })
      .where(eq(settings.key, REST_WEEKDAYS_KEY));
    return;
  }

  await db.insert(settings).values({ key: REST_WEEKDAYS_KEY, value });
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
