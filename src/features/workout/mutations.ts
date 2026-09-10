import { and, asc, desc, eq, inArray, isNull, max, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { newId } from '@/db/ids';
import {
  routineExercises,
  routines,
  sets,
  workoutExercises,
  workouts,
  type WorkoutSet,
} from '@/db/schema';
import { updatePersonalRecords, type NewRecord } from './records';

const touch = () => ({ updatedAt: Date.now() });

/** "Entreno de tarde" and friends — the same default naming Hevy uses. */
export function defaultWorkoutName(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 6) return 'Entreno de madrugada';
  if (hour < 12) return 'Entreno de manana';
  if (hour < 20) return 'Entreno de tarde';
  return 'Entreno de noche';
}

export async function getActiveWorkoutId(): Promise<string | null> {
  const [active] = await db
    .select({ id: workouts.id })
    .from(workouts)
    .where(and(isNull(workouts.finishedAt), isNull(workouts.deletedAt)))
    .orderBy(desc(workouts.startedAt))
    .limit(1);

  return active?.id ?? null;
}

/**
 * Starts an empty session, or returns the one already in progress. Only one
 * session may be active at a time; a second "start" is always a mistake, so it
 * resumes instead of creating a competing row.
 */
export async function startEmptyWorkout(): Promise<string> {
  const existing = await getActiveWorkoutId();
  if (existing) return existing;

  const id = newId();
  const startedAt = Date.now();

  await db.insert(workouts).values({ id, name: defaultWorkoutName(new Date(startedAt)), startedAt });

  return id;
}

/**
 * Appends exercises to a session, each with one empty set ready to fill, so the
 * user never has to tap "add set" before logging the first one.
 */
export async function addExercisesToWorkout(
  workoutId: string,
  exerciseIds: readonly string[]
): Promise<void> {
  if (exerciseIds.length === 0) return;

  const [{ value: lastPosition } = { value: null }] = await db
    .select({ value: max(workoutExercises.position) })
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, workoutId));

  let position = (lastPosition ?? -1) + 1;

  for (const exerciseId of exerciseIds) {
    const workoutExerciseId = newId();

    // The expo-sqlite driver runs transactions synchronously: the callback must
    // not be async, and every statement inside it needs an explicit .run().
    db.transaction((tx) => {
      tx.insert(workoutExercises)
        .values({ id: workoutExerciseId, workoutId, exerciseId, position })
        .run();

      tx.insert(sets).values({ id: newId(), workoutExerciseId, position: 0 }).run();
    });

    position += 1;
  }
}

/**
 * Adds a set, carrying over the load of the previous one. Repeating the last set
 * is the common case; changing the number afterwards is one tap.
 */
export async function addSet(workoutExerciseId: string): Promise<void> {
  const previous = await db
    .select()
    .from(sets)
    .where(eq(sets.workoutExerciseId, workoutExerciseId))
    .orderBy(desc(sets.position))
    .limit(1);

  const last = previous.at(0);

  await db.insert(sets).values({
    id: newId(),
    workoutExerciseId,
    position: (last?.position ?? -1) + 1,
    type: last?.type === 'warmup' ? 'normal' : (last?.type ?? 'normal'),
    weight: last?.weight ?? null,
    reps: last?.reps ?? null,
    durationS: last?.durationS ?? null,
    distanceM: last?.distanceM ?? null,
  });
}

export type SetPatch = Partial<
  Pick<WorkoutSet, 'weight' | 'reps' | 'rpe' | 'durationS' | 'distanceM' | 'type' | 'completed'>
>;

export async function updateSet(setId: string, patch: SetPatch): Promise<void> {
  await db
    .update(sets)
    .set({ ...patch, ...touch() })
    .where(eq(sets.id, setId));
}

/**
 * Marking a set done is also the moment its empty fields become meaningful, so
 * the placeholders shown from last time are written in as real values.
 */
export async function completeSet(setId: string, fallback: SetPatch): Promise<void> {
  const [current] = await db.select().from(sets).where(eq(sets.id, setId));
  if (!current) return;

  const patch: SetPatch = { completed: !current.completed };

  if (!current.completed) {
    if (current.weight === null && fallback.weight != null) patch.weight = fallback.weight;
    if (current.reps === null && fallback.reps != null) patch.reps = fallback.reps;
    if (current.durationS === null && fallback.durationS != null) patch.durationS = fallback.durationS;
    if (current.distanceM === null && fallback.distanceM != null) patch.distanceM = fallback.distanceM;
  }

  await updateSet(setId, patch);
}

export async function deleteSet(setId: string): Promise<void> {
  const [target] = await db.select().from(sets).where(eq(sets.id, setId));
  if (!target) return;

  db.transaction((tx) => {
    tx.delete(sets).where(eq(sets.id, setId)).run();
    // Keep positions contiguous so set numbers stay 1..n after a deletion.
    tx.update(sets)
      .set({ position: sql`${sets.position} - 1`, updatedAt: Date.now() })
      .where(
        and(
          eq(sets.workoutExerciseId, target.workoutExerciseId),
          sql`${sets.position} > ${target.position}`
        )
      )
      .run();
  });
}

export async function removeWorkoutExercise(workoutExerciseId: string): Promise<void> {
  const [target] = await db
    .select()
    .from(workoutExercises)
    .where(eq(workoutExercises.id, workoutExerciseId));
  if (!target) return;

  db.transaction((tx) => {
    // Sets are removed by the cascade declared on the foreign key.
    tx.delete(workoutExercises).where(eq(workoutExercises.id, workoutExerciseId)).run();
    tx.update(workoutExercises)
      .set({ position: sql`${workoutExercises.position} - 1`, updatedAt: Date.now() })
      .where(
        and(
          eq(workoutExercises.workoutId, target.workoutId),
          sql`${workoutExercises.position} > ${target.position}`
        )
      )
      .run();
  });
}

export async function updateWorkout(
  workoutId: string,
  patch: Partial<{ name: string; notes: string | null }>
): Promise<void> {
  await db
    .update(workouts)
    .set({ ...patch, ...touch() })
    .where(eq(workouts.id, workoutId));
}

export async function updateWorkoutExerciseNotes(
  workoutExerciseId: string,
  notes: string | null
): Promise<void> {
  await db
    .update(workoutExercises)
    .set({ notes, ...touch() })
    .where(eq(workoutExercises.id, workoutExerciseId));
}

export type FinishResult =
  | { status: 'finished'; durationMs: number; records: NewRecord[] }
  | { status: 'discarded'; reason: 'empty' };

/**
 * Ends the session. Unchecked sets are dropped rather than saved as zeros, and a
 * session with nothing checked is discarded outright: an empty row in the
 * history would only be noise.
 */
export async function finishWorkout(workoutId: string): Promise<FinishResult> {
  const [{ completed = 0 } = {}] = await db
    .select({ completed: sql<number>`count(*)` })
    .from(sets)
    .innerJoin(workoutExercises, eq(workoutExercises.id, sets.workoutExerciseId))
    .where(and(eq(workoutExercises.workoutId, workoutId), eq(sets.completed, true)));

  if (completed === 0) {
    await discardWorkout(workoutId);
    return { status: 'discarded', reason: 'empty' };
  }

  const [workout] = await db.select().from(workouts).where(eq(workouts.id, workoutId));
  const finishedAt = Date.now();

  db.transaction((tx) => {
    const incomplete = tx
      .select({ id: sets.id })
      .from(sets)
      .innerJoin(workoutExercises, eq(workoutExercises.id, sets.workoutExerciseId))
      .where(and(eq(workoutExercises.workoutId, workoutId), eq(sets.completed, false)))
      .all();

    if (incomplete.length > 0) {
      tx.delete(sets)
        .where(
          inArray(
            sets.id,
            incomplete.map((row) => row.id)
          )
        )
        .run();
    }

    // An exercise left with no sets was never really performed.
    const empty = tx
      .select({ id: workoutExercises.id })
      .from(workoutExercises)
      .leftJoin(sets, eq(sets.workoutExerciseId, workoutExercises.id))
      .where(eq(workoutExercises.workoutId, workoutId))
      .groupBy(workoutExercises.id)
      .having(sql`count(${sets.id}) = 0`)
      .all();

    if (empty.length > 0) {
      tx.delete(workoutExercises)
        .where(
          inArray(
            workoutExercises.id,
            empty.map((row) => row.id)
          )
        )
        .run();
    }

    tx.update(workouts)
      .set({ finishedAt, ...touch() })
      .where(eq(workouts.id, workoutId))
      .run();
  });

  // Records are derived from the sets, so they are computed once the session is
  // closed and its sets can no longer change.
  const records = await updatePersonalRecords(workoutId, finishedAt);

  if (workout?.routineId) {
    await db
      .update(routines)
      .set({ lastPerformedAt: finishedAt, ...touch() })
      .where(eq(routines.id, workout.routineId));
  }

  return {
    status: 'finished',
    durationMs: finishedAt - (workout?.startedAt ?? finishedAt),
    records,
  };
}

/**
 * Starts a session from a routine, copying its exercises with their rest times
 * and superset groups, and creating the planned number of empty sets.
 *
 * The copy is deliberate: editing the routine afterwards must not rewrite a
 * session that was already performed.
 */
export async function startWorkoutFromRoutine(routineId: string): Promise<string> {
  const existing = await getActiveWorkoutId();
  if (existing) return existing;

  const [routine] = await db.select().from(routines).where(eq(routines.id, routineId));
  if (!routine) throw new Error('La rutina ya no existe');

  const planned = await db
    .select()
    .from(routineExercises)
    .where(eq(routineExercises.routineId, routineId))
    .orderBy(asc(routineExercises.position));

  const workoutId = newId();
  const startedAt = Date.now();

  db.transaction((tx) => {
    tx.insert(workouts).values({ id: workoutId, routineId, name: routine.name, startedAt }).run();

    for (const item of planned) {
      const workoutExerciseId = newId();

      tx.insert(workoutExercises)
        .values({
          id: workoutExerciseId,
          workoutId,
          exerciseId: item.exerciseId,
          position: item.position,
          supersetGroup: item.supersetGroup,
          restSeconds: item.restSeconds,
        })
        .run();

      const plannedSets = Math.max(1, item.targetSets ?? 1);
      for (let position = 0; position < plannedSets; position += 1) {
        tx.insert(sets).values({ id: newId(), workoutExerciseId, position }).run();
      }
    }
  });

  return workoutId;
}

/** Rest between sets, in seconds. Null turns the timer off for that exercise. */
export async function updateWorkoutExerciseRest(
  workoutExerciseId: string,
  restSeconds: number | null
): Promise<void> {
  await db
    .update(workoutExercises)
    .set({ restSeconds, ...touch() })
    .where(eq(workoutExercises.id, workoutExerciseId));
}

/**
 * Throws the session away. This is a hard delete on purpose: a discarded session
 * was never data the user wanted, so there is nothing to replicate later.
 */
export async function discardWorkout(workoutId: string): Promise<void> {
  await db.delete(workouts).where(eq(workouts.id, workoutId));
}

/**
 * Removes a finished session from the history. Soft delete: personal records
 * point at the session that set them, and a hard delete would take those with
 * it. Records already earned are not recalculated, so they never drop.
 */
export async function deleteWorkout(workoutId: string): Promise<void> {
  await db
    .update(workouts)
    .set({ deletedAt: Date.now(), ...touch() })
    .where(eq(workouts.id, workoutId));
}

/** Exercise ids already in the session, so the picker can mark them as added. */
export async function getWorkoutExerciseIds(workoutId: string): Promise<string[]> {
  const rows = await db
    .select({ exerciseId: workoutExercises.exerciseId })
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, workoutId))
    .orderBy(asc(workoutExercises.position));

  return rows.map((row) => row.exerciseId);
}
