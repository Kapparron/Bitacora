import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm';

import { db } from '../client';
import { newId } from '../ids';
import { exercises, routineExercises, workoutExercises } from '../schema';
import { CATALOGUE, type CatalogueExercise } from './catalogue';

/** Columns per row times rows must stay under SQLite's 999 bound parameters. */
const INSERT_CHUNK = 60;

/**
 * Inserts every catalogue exercise that is not in the database yet, matching on
 * the upstream id. Runs on every start after migrations so a later app version
 * can ship new entries.
 *
 * Existing rows are left untouched: the user may have added notes to them, and
 * their custom exercises must never be overwritten.
 */
export async function seedExercises(): Promise<number> {
  const existing = await db
    .select({ externalId: exercises.externalId })
    .from(exercises)
    .where(isNotNull(exercises.externalId));

  const known = new Set(existing.map((row) => row.externalId));
  const missing = CATALOGUE.filter((exercise) => !known.has(exercise.id));

  if (missing.length > 0) {
    for (let offset = 0; offset < missing.length; offset += INSERT_CHUNK) {
      const chunk = missing.slice(offset, offset + INSERT_CHUNK).map(toRow);
      // One transaction per chunk: the driver is synchronous, so a single
      // transaction around all 1300 rows would block the JS thread far longer.
      db.transaction((tx) => {
        tx.insert(exercises).values(chunk).run();
      });
    }
  }

  await removeUnusedLegacyExercises();

  return missing.length;
}

function toRow(exercise: CatalogueExercise) {
  return {
    id: newId(),
    externalId: exercise.id,
    name: exercise.name,
    nameEn: exercise.nameEn,
    muscleGroup: exercise.muscleGroup,
    equipment: exercise.equipment,
    bodyPart: exercise.bodyPart,
    steps: exercise.steps,
    imagePath: exercise.image,
    gifPath: exercise.gif,
    trackingType: exercise.tracking,
    isCustom: false,
  };
}

/**
 * Drops the small hand-written catalogue that shipped before the dataset was
 * adopted. Rows still referenced by a logged workout or a routine are kept, so
 * no history ever loses the exercise it points at.
 */
async function removeUnusedLegacyExercises(): Promise<void> {
  const legacy = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(and(isNull(exercises.externalId), eq(exercises.isCustom, false)));

  if (legacy.length === 0) return;

  const referenced = await db
    .select({ id: workoutExercises.exerciseId })
    .from(workoutExercises)
    .union(db.select({ id: routineExercises.exerciseId }).from(routineExercises));

  const keep = new Set(referenced.map((row) => row.id));
  const removable = legacy.map((row) => row.id).filter((id) => !keep.has(id));

  if (removable.length === 0) return;

  await db.delete(exercises).where(inArray(exercises.id, removable));
}
