import { and, asc, eq, inArray, isNull, max, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { newId } from '@/db/ids';
import { exercises, routineExercises, routines } from '@/db/schema';

import type { SharedRoutine } from './share';

const touch = () => ({ updatedAt: Date.now() });

export async function createRoutine(name: string): Promise<string> {
  const [{ value: lastPosition } = { value: null }] = await db
    .select({ value: max(routines.position) })
    .from(routines);

  const id = newId();
  await db.insert(routines).values({
    id,
    name: name.trim() || 'Rutina sin nombre',
    position: (lastPosition ?? -1) + 1,
  });

  return id;
}

export async function updateRoutine(
  routineId: string,
  patch: Partial<{
    name: string;
    notes: string | null;
    scheduleType: 'none' | 'weekdays' | 'interval';
    scheduleWeekdays: number[] | null;
    scheduleIntervalDays: number | null;
    scheduleAnchor: string | null;
  }>
): Promise<void> {
  await db
    .update(routines)
    .set({ ...patch, ...touch() })
    .where(eq(routines.id, routineId));
}

/**
 * Hard delete. Its exercises go with it through the cascade, while sessions
 * performed from it keep their own copy and only lose the back-reference.
 */
export async function deleteRoutine(routineId: string): Promise<void> {
  await db.delete(routines).where(eq(routines.id, routineId));
}

export async function addExercisesToRoutine(
  routineId: string,
  exerciseIds: readonly string[]
): Promise<void> {
  if (exerciseIds.length === 0) return;

  const [{ value: lastPosition } = { value: null }] = await db
    .select({ value: max(routineExercises.position) })
    .from(routineExercises)
    .where(eq(routineExercises.routineId, routineId));

  let position = (lastPosition ?? -1) + 1;

  const rows = exerciseIds.map((exerciseId) => ({
    id: newId(),
    routineId,
    exerciseId,
    position: position++,
    targetSets: 3,
    restSeconds: 90,
  }));

  await db.insert(routineExercises).values(rows);
}

export async function updateRoutineExercise(
  routineExerciseId: string,
  patch: Partial<{
    targetSets: number | null;
    targetReps: string | null;
    restSeconds: number | null;
    notes: string | null;
  }>
): Promise<void> {
  await db
    .update(routineExercises)
    .set({ ...patch, ...touch() })
    .where(eq(routineExercises.id, routineExerciseId));
}

export async function removeRoutineExercise(routineExerciseId: string): Promise<void> {
  const [target] = await db
    .select()
    .from(routineExercises)
    .where(eq(routineExercises.id, routineExerciseId));
  if (!target) return;

  db.transaction((tx) => {
    tx.delete(routineExercises).where(eq(routineExercises.id, routineExerciseId)).run();
    tx.update(routineExercises)
      .set({ position: sql`${routineExercises.position} - 1`, updatedAt: Date.now() })
      .where(
        and(
          eq(routineExercises.routineId, target.routineId),
          sql`${routineExercises.position} > ${target.position}`
        )
      )
      .run();
  });
}

/** Rewrites every position from the new order, keeping them contiguous. */
export async function reorderRoutineExercises(
  routineId: string,
  orderedIds: readonly string[]
): Promise<void> {
  db.transaction((tx) => {
    orderedIds.forEach((id, position) => {
      tx.update(routineExercises)
        .set({ position, updatedAt: Date.now() })
        .where(and(eq(routineExercises.id, id), eq(routineExercises.routineId, routineId)))
        .run();
    });
  });
}

/**
 * Joins an exercise with the one below it into a superset, or extends the group
 * that one already belongs to. Supersets are always consecutive, which is what
 * makes them a single alternating block during the session.
 */
export async function linkWithNext(routineExerciseId: string): Promise<void> {
  const [target] = await db
    .select()
    .from(routineExercises)
    .where(eq(routineExercises.id, routineExerciseId));
  if (!target) return;

  const [next] = await db
    .select()
    .from(routineExercises)
    .where(
      and(
        eq(routineExercises.routineId, target.routineId),
        eq(routineExercises.position, target.position + 1)
      )
    );

  if (!next) return;

  const group =
    target.supersetGroup ?? next.supersetGroup ?? (await nextSupersetGroup(target.routineId));

  db.transaction((tx) => {
    tx.update(routineExercises)
      .set({ supersetGroup: group, updatedAt: Date.now() })
      .where(eq(routineExercises.id, target.id))
      .run();

    tx.update(routineExercises)
      .set({ supersetGroup: group, updatedAt: Date.now() })
      .where(eq(routineExercises.id, next.id))
      .run();
  });
}

/** Takes one exercise out of its superset. A group left alone is dissolved. */
export async function unlinkSuperset(routineExerciseId: string): Promise<void> {
  const [target] = await db
    .select()
    .from(routineExercises)
    .where(eq(routineExercises.id, routineExerciseId));
  if (!target?.supersetGroup) return;

  await db
    .update(routineExercises)
    .set({ supersetGroup: null, ...touch() })
    .where(eq(routineExercises.id, routineExerciseId));

  const remaining = await db
    .select({ id: routineExercises.id })
    .from(routineExercises)
    .where(
      and(
        eq(routineExercises.routineId, target.routineId),
        eq(routineExercises.supersetGroup, target.supersetGroup)
      )
    );

  if (remaining.length === 1) {
    await db
      .update(routineExercises)
      .set({ supersetGroup: null, ...touch() })
      .where(eq(routineExercises.id, remaining[0].id));
  }
}

async function nextSupersetGroup(routineId: string): Promise<number> {
  const [{ value } = { value: null }] = await db
    .select({ value: max(routineExercises.supersetGroup) })
    .from(routineExercises)
    .where(eq(routineExercises.routineId, routineId));

  return (value ?? 0) + 1;
}

export type ImportResult =
  | { status: 'imported'; routineId: string }
  /** The code names catalogue exercises this phone does not have yet. */
  | { status: 'missing_exercises' };

/**
 * Saves a routine received from someone else as a new routine at the end of the
 * list. Catalogue exercises are matched by dataset id. A custom exercise reuses
 * one of the user's own with the same name and tracking type, so importing
 * twice does not duplicate it, and is created otherwise.
 *
 * Nothing is written unless every exercise resolves: a routine with holes in it
 * would be worse than none.
 */
export async function importRoutine(shared: SharedRoutine): Promise<ImportResult> {
  const externalIds = [
    ...new Set(shared.e.flatMap((entry) => ('x' in entry.e ? [entry.e.x] : []))),
  ];

  const catalogue =
    externalIds.length === 0
      ? []
      : await db
          .select({ id: exercises.id, externalId: exercises.externalId })
          .from(exercises)
          .where(inArray(exercises.externalId, externalIds));

  const byExternalId = new Map(catalogue.map((row) => [row.externalId, row.id]));
  if (byExternalId.size < externalIds.length) return { status: 'missing_exercises' };

  const ownExercises = await db
    .select({ id: exercises.id, name: exercises.name, trackingType: exercises.trackingType })
    .from(exercises)
    .where(and(eq(exercises.isCustom, true), isNull(exercises.deletedAt)));

  const customKey = (name: string, trackingType: string) =>
    `${name.trim().toLowerCase()}|${trackingType}`;
  const byCustomKey = new Map(ownExercises.map((row) => [customKey(row.name, row.trackingType), row.id]));

  const [{ value: lastPosition } = { value: null }] = await db
    .select({ value: max(routines.position) })
    .from(routines);

  const routineId = newId();

  db.transaction((tx) => {
    tx.insert(routines)
      .values({
        id: routineId,
        name: shared.n || 'Rutina sin nombre',
        notes: shared.o,
        position: (lastPosition ?? -1) + 1,
      })
      .run();

    shared.e.forEach((entry, position) => {
      let exerciseId: string;

      if ('x' in entry.e) {
        exerciseId = byExternalId.get(entry.e.x)!;
      } else {
        const key = customKey(entry.e.n, entry.e.t);
        const existing = byCustomKey.get(key);

        if (existing) {
          exerciseId = existing;
        } else {
          exerciseId = newId();
          tx.insert(exercises)
            .values({
              id: exerciseId,
              name: entry.e.n,
              muscleGroup: entry.e.m,
              equipment: entry.e.q,
              trackingType: entry.e.t,
              isCustom: true,
            })
            .run();
          byCustomKey.set(key, exerciseId);
        }
      }

      tx.insert(routineExercises)
        .values({
          id: newId(),
          routineId,
          exerciseId,
          position,
          supersetGroup: entry.g,
          targetSets: entry.s,
          targetReps: entry.r,
          restSeconds: entry.d,
          notes: entry.o,
        })
        .run();
    });
  });

  return { status: 'imported', routineId };
}

/** Exercise ids already in the routine, so the picker can pre-tick them. */
export async function getRoutineExerciseIds(routineId: string): Promise<string[]> {
  const rows = await db
    .select({ exerciseId: routineExercises.exerciseId })
    .from(routineExercises)
    .where(eq(routineExercises.routineId, routineId))
    .orderBy(asc(routineExercises.position));

  return rows.map((row) => row.exerciseId);
}
