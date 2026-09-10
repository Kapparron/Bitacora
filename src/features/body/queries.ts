import { asc, desc } from 'drizzle-orm';

import { db } from '@/db/client';
import { useLiveTables } from '@/db/live';
import { bodyMetrics, type BodyMetric } from '@/db/schema';

/** Every measurement, oldest first, which is the order a chart plots them in. */
export function useBodyMetrics(): { metrics: BodyMetric[]; loading: boolean } {
  const { data, loading } = useLiveTables(
    ['body_metrics'],
    () => db.select().from(bodyMetrics).orderBy(asc(bodyMetrics.date)),
    []
  );

  return { metrics: data ?? [], loading };
}

/** Most recent measurement that has a weight, for the summary line. */
export function useLatestWeight(): BodyMetric | null {
  const { data } = useLiveTables(
    ['body_metrics'],
    () => db.select().from(bodyMetrics).orderBy(desc(bodyMetrics.date)),
    []
  );

  return (data ?? []).find((metric) => metric.weight !== null) ?? null;
}
