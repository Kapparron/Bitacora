import { and, desc, eq, isNotNull, isNull, ne, sql } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { db } from '@/db/client';
import {
  exercises,
  sets,
  workoutExercises,
  workouts,
  type Exercise,
  type Workout,
  type WorkoutSet,
} from '@/db/schema';

/** One exercise inside a session, with its sets in display order. */
export type WorkoutEntry = {
  workoutExerciseId: string;
  position: number;
  exercise: Exercise;
  notes: string | null;
  sets: WorkoutSet[];
};

export type WorkoutContents = {
  workout: Workout;
  entries: WorkoutEntry[];
};

/**
 * Flat join of a session and everything under it. Grouping happens in JS: the
 * row count per session is small (tens), and one query keeps the live-query
 * subscription single, so a set edit re-renders the screen exactly once.
 */
function contentsQuery(where: ReturnType<typeof and>) {
  return db
    .select({ workout: workouts, workoutExercise: workoutExercises, exercise: exercises, set: sets })
    .from(workouts)
    .leftJoin(workoutExercises, eq(workoutExercises.workoutId, workouts.id))
    .leftJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .leftJoin(sets, eq(sets.workoutExerciseId, workoutExercises.id))
    .where(where)
    .orderBy(workouts.startedAt, workoutExercises.position, sets.position);
}

type ContentsRow = {
  workout: Workout;
  workoutExercise: typeof workoutExercises.$inferSelect | null;
  exercise: Exercise | null;
  set: WorkoutSet | null;
};

function groupContents(rows: ContentsRow[]): WorkoutContents | null {
  if (rows.length === 0) return null;

  const entries = new Map<string, WorkoutEntry>();

  for (const row of rows) {
    if (!row.workoutExercise || !row.exercise) continue;

    let entry = entries.get(row.workoutExercise.id);
    if (!entry) {
      entry = {
        workoutExerciseId: row.workoutExercise.id,
        position: row.workoutExercise.position,
        exercise: row.exercise,
        notes: row.workoutExercise.notes,
        sets: [],
      };
      entries.set(row.workoutExercise.id, entry);
    }

    // The join repeats the exercise row once per set, so guard against duplicates.
    if (row.set && !entry.sets.some((existing) => existing.id === row.set!.id)) {
      entry.sets.push(row.set);
    }
  }

  return { workout: rows[0].workout, entries: [...entries.values()] };
}

/**
 * The session in progress, or null. The database is the single source of truth
 * for it, so killing the app mid-workout loses nothing.
 */
export function useActiveWorkout(): { contents: WorkoutContents | null; loading: boolean } {
  const { data, updatedAt } = useLiveQuery(
    contentsQuery(and(isNull(workouts.finishedAt), isNull(workouts.deletedAt)))
  );

  const contents = useMemo(() => groupContents(data as ContentsRow[]), [data]);
  return { contents, loading: updatedAt === undefined };
}

export function useWorkoutContents(workoutId: string): {
  contents: WorkoutContents | null;
  loading: boolean;
} {
  const { data, updatedAt } = useLiveQuery(
    contentsQuery(and(eq(workouts.id, workoutId), isNull(workouts.deletedAt)))
  );

  const contents = useMemo(() => groupContents(data as ContentsRow[]), [data]);
  return { contents, loading: updatedAt === undefined };
}

export type WorkoutSummary = {
  id: string;
  name: string;
  startedAt: number;
  finishedAt: number | null;
  exerciseCount: number;
  setCount: number;
  volume: number;
};

/**
 * Finished sessions, newest first, with their totals computed in SQL so the
 * history list does not have to load every set.
 */
export function useWorkoutHistory(): { workouts: WorkoutSummary[]; loading: boolean } {
  const { data, updatedAt } = useLiveQuery(
    db
      .select({
        id: workouts.id,
        name: workouts.name,
        startedAt: workouts.startedAt,
        finishedAt: workouts.finishedAt,
        exerciseCount: sql<number>`count(distinct ${workoutExercises.id})`,
        setCount: sql<number>`count(distinct case when ${sets.completed} = 1 then ${sets.id} end)`,
        volume: sql<number>`coalesce(sum(case when ${sets.completed} = 1 and ${sets.type} <> 'warmup' then ${sets.weight} * ${sets.reps} else 0 end), 0)`,
      })
      .from(workouts)
      .leftJoin(workoutExercises, eq(workoutExercises.workoutId, workouts.id))
      .leftJoin(sets, eq(sets.workoutExerciseId, workoutExercises.id))
      .where(and(isNotNull(workouts.finishedAt), isNull(workouts.deletedAt)))
      .groupBy(workouts.id)
      .orderBy(desc(workouts.startedAt))
  );

  return { workouts: data as WorkoutSummary[], loading: updatedAt === undefined };
}

/**
 * Sets of the most recent finished session that included this exercise. Shown as
 * placeholders in the active session so the user can repeat or beat last time
 * without leaving the screen.
 */
export async function getLastPerformance(
  exerciseId: string,
  excludeWorkoutId: string
): Promise<WorkoutSet[]> {
  const [lastEntry] = await db
    .select({ workoutExerciseId: workoutExercises.id })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .where(
      and(
        eq(workoutExercises.exerciseId, exerciseId),
        ne(workoutExercises.workoutId, excludeWorkoutId),
        isNotNull(workouts.finishedAt),
        isNull(workouts.deletedAt)
      )
    )
    .orderBy(desc(workouts.startedAt))
    .limit(1);

  if (!lastEntry) return [];

  return db
    .select()
    .from(sets)
    .where(and(eq(sets.workoutExerciseId, lastEntry.workoutExerciseId), eq(sets.completed, true)))
    .orderBy(sets.position);
}
