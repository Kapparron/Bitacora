import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { useMemo } from 'react';

import { db } from '@/db/client';
import { useLiveTables } from '@/db/live';
import {
  exercises,
  routineExercises,
  routines,
  type Exercise,
  type Routine,
} from '@/db/schema';

const ROUTINE_TABLES = ['routines', 'routine_exercises', 'exercises'] as const;

export type RoutineSummary = {
  id: string;
  name: string;
  position: number;
  lastPerformedAt: number | null;
  scheduleType: Routine['scheduleType'];
  scheduleWeekdays: number[] | null;
  scheduleIntervalDays: number | null;
  scheduleAnchor: string | null;
  exerciseCount: number;
  /** Comma-separated exercise names, for the one-line preview in the list. */
  preview: string | null;
};

export type RoutineEntry = {
  routineExerciseId: string;
  position: number;
  supersetGroup: number | null;
  targetSets: number | null;
  targetReps: string | null;
  restSeconds: number | null;
  notes: string | null;
  exercise: Exercise;
};

export type RoutineContents = {
  routine: Routine;
  entries: RoutineEntry[];
};

/**
 * Every routine with its exercise count and a preview of the first few names,
 * both built in SQL so the list does not have to load their contents.
 */
export function useRoutines(): { routines: RoutineSummary[]; loading: boolean } {
  const { data, loading } = useLiveTables(
    'useRoutines',
    ROUTINE_TABLES,
    async () =>
      db
        .select({
          id: routines.id,
          name: routines.name,
          position: routines.position,
          lastPerformedAt: routines.lastPerformedAt,
          scheduleType: routines.scheduleType,
          scheduleWeekdays: routines.scheduleWeekdays,
          scheduleIntervalDays: routines.scheduleIntervalDays,
          scheduleAnchor: routines.scheduleAnchor,
          exerciseCount: sql<number>`count(${routineExercises.id})`,
          preview: sql<string | null>`group_concat(${exercises.name}, ', ')`,
        })
        .from(routines)
        .leftJoin(routineExercises, eq(routineExercises.routineId, routines.id))
        .leftJoin(exercises, eq(exercises.id, routineExercises.exerciseId))
        .where(isNull(routines.deletedAt))
        .groupBy(routines.id)
        .orderBy(asc(routines.position), asc(routines.name)),
    []
  );

  return { routines: data ?? [], loading };
}

export function useRoutineContents(routineId: string): {
  contents: RoutineContents | null;
  loading: boolean;
} {
  const { data, loading } = useLiveTables(
    'useRoutineContents',
    ROUTINE_TABLES,
    async () => {
      const [routine] = await db
        .select()
        .from(routines)
        .where(and(eq(routines.id, routineId), isNull(routines.deletedAt)));

      if (!routine) return null;

      const rows = await db
        .select({ routineExercise: routineExercises, exercise: exercises })
        .from(routineExercises)
        .innerJoin(exercises, eq(exercises.id, routineExercises.exerciseId))
        .where(eq(routineExercises.routineId, routineId))
        .orderBy(asc(routineExercises.position));

      const entries: RoutineEntry[] = rows.map((row) => ({
        routineExerciseId: row.routineExercise.id,
        position: row.routineExercise.position,
        supersetGroup: row.routineExercise.supersetGroup,
        targetSets: row.routineExercise.targetSets,
        targetReps: row.routineExercise.targetReps,
        restSeconds: row.routineExercise.restSeconds,
        notes: row.routineExercise.notes,
        exercise: row.exercise,
      }));

      return { routine, entries } satisfies RoutineContents;
    },
    [routineId]
  );

  return { contents: data ?? null, loading };
}

/**
 * Names of the catalogue exercises a shared routine points at, by dataset id.
 * An id left out of the map is one this version of the catalogue does not have.
 * Null until the lookup has run.
 */
export function useCatalogueNames(externalIds: readonly string[]): Map<string, string> | null {
  const key = externalIds.join(',');
  const { data } = useLiveTables(
    'useCatalogueNames',
    ['exercises'],
    () =>
      externalIds.length === 0
        ? Promise.resolve([])
        : db
            .select({ externalId: exercises.externalId, name: exercises.name })
            .from(exercises)
            .where(inArray(exercises.externalId, [...externalIds])),
    [key]
  );

  return useMemo(
    () =>
      data
        ? new Map(data.flatMap((row) => (row.externalId ? [[row.externalId, row.name] as const] : [])))
        : null,
    [data]
  );
}
