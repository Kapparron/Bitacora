import {
  bodyMetrics,
  exercises,
  foodEntries,
  foods,
  nutritionGoals,
  personalRecords,
  restDays,
  routineExercises,
  routines,
  sets,
  settings,
  workoutExercises,
  workouts,
} from '@/db/schema';

/**
 * Tables in dependency order: a row only references tables above it. Exporting
 * follows this order and restoring inserts in it, so foreign keys hold at every
 * step; deleting walks it backwards.
 *
 * Apart from backup.ts, which opens files and the share sheet, so the checks can
 * read the list the app really uses.
 */
export const TABLES = [
  ['exercises', exercises],
  ['routines', routines],
  ['routineExercises', routineExercises],
  ['workouts', workouts],
  ['workoutExercises', workoutExercises],
  ['sets', sets],
  ['personalRecords', personalRecords],
  ['foods', foods],
  ['foodEntries', foodEntries],
  ['nutritionGoals', nutritionGoals],
  ['bodyMetrics', bodyMetrics],
  ['restDays', restDays],
  ['settings', settings],
] as const;
