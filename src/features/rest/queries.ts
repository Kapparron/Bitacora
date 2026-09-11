import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { useLiveTables } from '@/db/live';
import { restDays, settings } from '@/db/schema';
import { parseRestWeekdays, type RestPlan } from '@/features/rest/rest';

/**
 * The rest plan: the weekdays kept for rest and the days marked by hand.
 *
 * Both are read at once because everything that asks about rest needs both, and
 * one hook means one refetch when either changes.
 */
export function useRestPlan(): RestPlan {
  const { data } = useLiveTables(
    ['settings', 'rest_days'],
    async () => {
      const [weekly] = await db
        .select()
        .from(settings)
        .where(eq(settings.key, 'rest_weekdays'));

      const marked = await db.select().from(restDays);

      return { weekly: weekly?.value ?? null, marked: marked.map((row) => row.day) };
    },
    []
  );

  return {
    weekdays: parseRestWeekdays(data?.weekly ?? null),
    days: new Set(data?.marked ?? []),
  };
}
