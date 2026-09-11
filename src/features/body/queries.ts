import { asc, desc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { useLiveTables } from '@/db/live';
import { bodyMetrics, settings, type BodyMetric } from '@/db/schema';

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

/** Weight the user is aiming for, or null when none is set. */
export function useTargetWeight(): number | null {
  const { data } = useLiveTables(
    ['settings'],
    () => db.select().from(settings).where(eq(settings.key, 'target_weight')),
    []
  );

  const raw = (data ?? []).at(0)?.value;
  if (raw === undefined) return null;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}
