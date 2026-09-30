import { asc, eq, isNull } from 'drizzle-orm';

import { db } from '@/db/client';
import { useLiveTables } from '@/db/live';
import { exercises, type Exercise } from '@/db/schema';

const NO_EXERCISES: Exercise[] = [];
const NO_VALUES: string[] = [];

/** The whole catalogue plus the user's own exercises, grouped by muscle. */
export function useCatalogue(): Exercise[] {
  const { data } = useLiveTables(
    'useCatalogue',
    ['exercises'],
    () =>
      db
        .select()
        .from(exercises)
        .where(isNull(exercises.deletedAt))
        .orderBy(asc(exercises.muscleGroup), asc(exercises.name)),
    []
  );

  return data ?? NO_EXERCISES;
}

/** One exercise, deleted or not: a past session still opens it. */
export function useExercise(exerciseId: string): { exercise: Exercise | null; loading: boolean } {
  const { data, loading } = useLiveTables(
    'useExercise',
    ['exercises'],
    async () => {
      const [found] = await db.select().from(exercises).where(eq(exercises.id, exerciseId));
      return found ?? null;
    },
    [exerciseId]
  );

  return { exercise: data ?? null, loading };
}

/**
 * Distinct values of one exercise field. The chips of a new exercise need some
 * thirty of them, and reading all 1.324 rows to build them was the slowest
 * thing on that screen.
 */
function useDistinct(
  name: string,
  column: typeof exercises.muscleGroup | typeof exercises.equipment
): string[] {
  const { data } = useLiveTables(
    name,
    ['exercises'],
    async () =>
      (
        await db
          .selectDistinct({ value: column })
          .from(exercises)
          .where(isNull(exercises.deletedAt))
          .orderBy(asc(column))
      ).map((row) => row.value),
    // The column is told apart by `name`.
    []
  );

  return data ?? NO_VALUES;
}

export function useMuscleGroups(): string[] {
  return useDistinct('useMuscleGroups', exercises.muscleGroup);
}

export function useEquipment(): string[] {
  return useDistinct('useEquipment', exercises.equipment);
}
