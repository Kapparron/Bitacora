import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { newId } from '@/db/ids';
import { exercises, type Exercise } from '@/db/schema';

const touch = () => ({ updatedAt: Date.now() });

export type CustomExerciseInput = {
  name: string;
  muscleGroup: string;
  equipment: string;
  trackingType: Exercise['trackingType'];
};

/**
 * Adds an exercise the catalogue does not have. It carries no `externalId` and
 * no media: the seed only ever touches rows that came from the dataset, so a
 * custom exercise survives every catalogue refresh.
 */
export async function createCustomExercise(input: CustomExerciseInput): Promise<string> {
  const id = newId();
  await db.insert(exercises).values({ id, ...input, isCustom: true });
  return id;
}

/**
 * Hides a custom exercise. Soft delete, because sessions and routines point at
 * it: a hard delete would cascade and take the sets that were performed with it.
 */
export async function deleteCustomExercise(id: string): Promise<void> {
  await db
    .update(exercises)
    .set({ deletedAt: Date.now(), ...touch() })
    .where(eq(exercises.id, id));
}
