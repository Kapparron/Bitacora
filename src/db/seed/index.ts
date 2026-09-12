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
 * Existing rows keep everything the user owns — their notes, and their custom
 * exercises, which are never touched. Only the catalogue's own naming columns
 * are refreshed, so a corrected name reaches an install that already has the
 * row.
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

  await refreshCatalogueNames();
  await removeUnusedLegacyExercises();

  return missing.length;
}

/**
 * Brings the columns the catalogue owns back in line with the shipped file for
 * rows that are already seeded, one update per row that drifted — normally
 * none. Steps and media are left out on purpose: reading them for all 1300 rows
 * on every start costs far more than the correction is worth.
 */
async function refreshCatalogueNames(): Promise<void> {
  const rows = await db
    .select({
      id: exercises.id,
      externalId: exercises.externalId,
      name: exercises.name,
      nameEn: exercises.nameEn,
      muscleGroup: exercises.muscleGroup,
      equipment: exercises.equipment,
    })
    .from(exercises)
    .where(and(isNotNull(exercises.externalId), eq(exercises.isCustom, false)));

  const byId = new Map(CATALOGUE.map((exercise) => [exercise.id, exercise]));

  const stale = rows.flatMap((row) => {
    const exercise = byId.get(row.externalId ?? '');
    if (!exercise) return [];

    const current = {
      name: exercise.name,
      nameEn: exercise.nameEn,
      muscleGroup: exercise.muscleGroup,
      equipment: exercise.equipment,
    };

    const drifted = Object.entries(current).some(
      ([column, value]) => row[column as keyof typeof current] !== value
    );

    return drifted ? [{ id: row.id, current }] : [];
  });

  if (stale.length === 0) return;

  db.transaction((tx) => {
    for (const row of stale) {
      tx.update(exercises).set(row.current).where(eq(exercises.id, row.id)).run();
    }
  });
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
