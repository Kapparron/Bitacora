import { eq } from 'drizzle-orm';

import { db } from '../client';
import { newId } from '../ids';
import { exercises } from '../schema';
import { SEED_EXERCISES } from './exercises';

/**
 * Inserts any built-in exercise that is not in the database yet. Runs on every
 * start after migrations so a later app version can ship new catalogue entries.
 * Existing rows are left untouched: the user may have edited notes on them, and
 * `is_custom` exercises must never be overwritten.
 */
export async function seedExercises(): Promise<number> {
  const existing = await db
    .select({ name: exercises.name })
    .from(exercises)
    .where(eq(exercises.isCustom, false));

  const known = new Set(existing.map((row) => row.name));
  const missing = SEED_EXERCISES.filter((exercise) => !known.has(exercise.name));

  if (missing.length === 0) return 0;

  await db.insert(exercises).values(
    missing.map((exercise) => ({
      id: newId(),
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      equipment: exercise.equipment,
      trackingType: exercise.trackingType ?? ('weight_reps' as const),
      isCustom: false,
    }))
  );

  return missing.length;
}
