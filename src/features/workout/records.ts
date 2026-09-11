import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/db/client';
import { newId } from '@/db/ids';
import { personalRecords, sets, workoutExercises, type WorkoutSet } from '@/db/schema';
import { RECORD_LABEL, type RecordType } from './set-records';
import { countsTowardsVolume, estimatedOneRepMax, setVolume } from './volume';

// Re-exported so the screens that show a record keep one import for it.
export { RECORD_LABEL, type RecordType };

export type NewRecord = {
  exerciseId: string;
  type: RecordType;
  value: number;
  /** Null the first time an exercise is recorded. */
  previous: number | null;
};

/** Best values a single session produced for one exercise. */
function bestOf(setsOfExercise: readonly WorkoutSet[]): Record<RecordType, number> {
  let heaviest = 0;
  let oneRepMax = 0;
  let bestSet = 0;
  let session = 0;

  for (const set of setsOfExercise) {
    if (!countsTowardsVolume(set)) continue;

    const volume = setVolume(set);
    session += volume;
    bestSet = Math.max(bestSet, volume);

    if (set.weight !== null) heaviest = Math.max(heaviest, set.weight);
    if (set.weight !== null && set.reps !== null) {
      oneRepMax = Math.max(oneRepMax, estimatedOneRepMax(set.weight, set.reps));
    }
  }

  return {
    heaviest_weight: heaviest,
    estimated_1rm: oneRepMax,
    best_set_volume: bestSet,
    session_volume: session,
  };
}

/**
 * Compares what a finished session achieved against the stored records and
 * writes the ones it beat.
 *
 * Records are derived data, kept in their own table so the history screens and
 * the "new record" banner never have to scan every set ever logged. Call this
 * after the session is finished, when its sets no longer change.
 */
export async function updatePersonalRecords(
  workoutId: string,
  achievedAt: number
): Promise<NewRecord[]> {
  const rows = await db
    .select({ exerciseId: workoutExercises.exerciseId, set: sets })
    .from(sets)
    .innerJoin(workoutExercises, eq(workoutExercises.id, sets.workoutExerciseId))
    .where(and(eq(workoutExercises.workoutId, workoutId), eq(sets.completed, true)));

  if (rows.length === 0) return [];

  const byExercise = new Map<string, WorkoutSet[]>();
  for (const row of rows) {
    const current = byExercise.get(row.exerciseId);
    if (current) current.push(row.set);
    else byExercise.set(row.exerciseId, [row.set]);
  }

  const exerciseIds = [...byExercise.keys()];
  const existing = await db
    .select()
    .from(personalRecords)
    .where(inArray(personalRecords.exerciseId, exerciseIds));

  const stored = new Map(existing.map((record) => [`${record.exerciseId}:${record.type}`, record]));
  const beaten: NewRecord[] = [];

  for (const [exerciseId, exerciseSets] of byExercise) {
    const best = bestOf(exerciseSets);

    for (const [type, value] of Object.entries(best) as [RecordType, number][]) {
      if (value <= 0) continue;

      const previous = stored.get(`${exerciseId}:${type}`);
      if (previous && previous.value >= value) continue;

      beaten.push({ exerciseId, type, value, previous: previous?.value ?? null });

      if (previous) {
        await db
          .update(personalRecords)
          .set({ value, workoutId, achievedAt, updatedAt: Date.now() })
          .where(eq(personalRecords.id, previous.id));
      } else {
        await db
          .insert(personalRecords)
          .values({ id: newId(), exerciseId, type, value, workoutId, achievedAt });
      }
    }
  }

  return beaten;
}

