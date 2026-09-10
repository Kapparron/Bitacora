import { and, asc, eq, max, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { newId } from '@/db/ids';
import { routineExercises, routineFolders, routines } from '@/db/schema';

const touch = () => ({ updatedAt: Date.now() });

export async function createRoutine(name: string, folderId: string | null = null): Promise<string> {
  const [{ value: lastPosition } = { value: null }] = await db
    .select({ value: max(routines.position) })
    .from(routines);

  const id = newId();
  await db.insert(routines).values({
    id,
    name: name.trim() || 'Rutina sin nombre',
    folderId,
    position: (lastPosition ?? -1) + 1,
  });

  return id;
}

export async function updateRoutine(
  routineId: string,
  patch: Partial<{ name: string; notes: string | null; folderId: string | null }>
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

/** Swaps an exercise with its neighbour, keeping positions contiguous. */
export async function moveRoutineExercise(
  routineExerciseId: string,
  direction: 'up' | 'down'
): Promise<void> {
  const [target] = await db
    .select()
    .from(routineExercises)
    .where(eq(routineExercises.id, routineExerciseId));
  if (!target) return;

  const neighbourPosition = target.position + (direction === 'up' ? -1 : 1);

  const [neighbour] = await db
    .select()
    .from(routineExercises)
    .where(
      and(
        eq(routineExercises.routineId, target.routineId),
        eq(routineExercises.position, neighbourPosition)
      )
    );

  if (!neighbour) return;

  db.transaction((tx) => {
    tx.update(routineExercises)
      .set({ position: target.position, updatedAt: Date.now() })
      .where(eq(routineExercises.id, neighbour.id))
      .run();

    tx.update(routineExercises)
      .set({ position: neighbourPosition, updatedAt: Date.now() })
      .where(eq(routineExercises.id, target.id))
      .run();
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

/* -------------------------------------------------------------------- folders */

export async function createFolder(name: string): Promise<string> {
  const [{ value: lastPosition } = { value: null }] = await db
    .select({ value: max(routineFolders.position) })
    .from(routineFolders);

  const id = newId();
  await db.insert(routineFolders).values({
    id,
    name: name.trim() || 'Carpeta',
    position: (lastPosition ?? -1) + 1,
  });

  return id;
}

export async function renameFolder(folderId: string, name: string): Promise<void> {
  await db
    .update(routineFolders)
    .set({ name: name.trim() || 'Carpeta', ...touch() })
    .where(eq(routineFolders.id, folderId));
}

/** Routines inside are kept; the foreign key drops them back to the root. */
export async function deleteFolder(folderId: string): Promise<void> {
  await db.delete(routineFolders).where(eq(routineFolders.id, folderId));
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
