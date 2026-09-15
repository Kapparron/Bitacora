import { inArray } from 'drizzle-orm';

import { db } from '@/db/client';
import { useLiveTables } from '@/db/live';
import { restDays, settings } from '@/db/schema';
import {
  parseRestCycle,
  parseRestWeekdays,
  REST_CYCLE_KEY,
  REST_WEEKDAYS_KEY,
  type RestPlan,
} from '@/features/rest/rest';

/**
 * The rest plan: the repeating rule and the days marked by hand.
 *
 * Both are read at once because everything that asks about rest needs both, and
 * one hook means one refetch when either changes.
 */
export function useRestPlan(): RestPlan {
  const { data } = useLiveTables(
    ['settings', 'rest_days'],
    async () => {
      const rows = await db
        .select()
        .from(settings)
        .where(inArray(settings.key, [REST_WEEKDAYS_KEY, REST_CYCLE_KEY]));

      const value = (key: string) => rows.find((row) => row.key === key)?.value ?? null;
      const marked = await db.select().from(restDays);

      return {
        weekly: value(REST_WEEKDAYS_KEY),
        cycle: value(REST_CYCLE_KEY),
        marked: marked.map((row) => row.day),
      };
    },
    []
  );

  return {
    weekdays: parseRestWeekdays(data?.weekly ?? null),
    cycle: parseRestCycle(data?.cycle ?? null),
    days: new Set(data?.marked ?? []),
  };
}
