import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { newId } from '@/db/ids';
import { bodyMetrics } from '@/db/schema';

const touch = () => ({ updatedAt: Date.now() });

export type BodyMetricInput = {
  /** Local calendar day as `YYYY-MM-DD`. */
  date: string;
  /** Kilograms. */
  weight: number | null;
  notes: string | null;
};

/**
 * Records a measurement, replacing the one already taken that day. A day holds
 * one measurement: the table's unique index says so, and weighing twice in a
 * morning is a correction, not a second data point.
 */
export async function saveBodyMetric(input: BodyMetricInput): Promise<void> {
  const [existing] = await db.select().from(bodyMetrics).where(eq(bodyMetrics.date, input.date));

  if (existing) {
    await db
      .update(bodyMetrics)
      .set({ ...input, ...touch() })
      .where(eq(bodyMetrics.id, existing.id));
    return;
  }

  await db.insert(bodyMetrics).values({ id: newId(), ...input });
}

/**
 * Hard delete: nothing references a measurement, so there is no history to keep
 * consistent.
 */
export async function deleteBodyMetric(id: string): Promise<void> {
  await db.delete(bodyMetrics).where(eq(bodyMetrics.id, id));
}

/**
 * Records a weight without touching whatever else was measured that day. Used
 * by the calorie calculator, which asks for a weight anyway and would otherwise
 * wipe the body fat and the notes of a day already logged.
 */
export async function recordWeight(date: string, weight: number): Promise<void> {
  const [existing] = await db.select().from(bodyMetrics).where(eq(bodyMetrics.date, date));

  if (existing) {
    await db
      .update(bodyMetrics)
      .set({ weight, ...touch() })
      .where(eq(bodyMetrics.id, existing.id));
    return;
  }

  await db.insert(bodyMetrics).values({ id: newId(), date, weight });
}
