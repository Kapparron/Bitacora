import type { Exercise } from '@/db/schema';
import { isObject, isText } from '@/lib/link';

/**
 * How an exercise identifies itself inside a shared link, used by both routines
 * and finished sessions.
 *
 * A catalogue exercise travels as its dataset id alone: every phone ships the
 * same catalogue, and so does the web page. Only an exercise the user created
 * goes with its fields, so the other side can name it too.
 */
export type SharedExercise =
  /** A catalogue exercise, by its id in the dataset. */
  | { x: string }
  /** A custom exercise: name, muscle group, equipment, tracking type. */
  | { n: string; m: string; q: string; t: Exercise['trackingType'] };

const TRACKING_TYPES: readonly Exercise['trackingType'][] = [
  'weight_reps',
  'reps',
  'duration',
  'distance_duration',
];

export function toSharedExercise(exercise: Exercise): SharedExercise {
  return exercise.externalId && !exercise.isCustom
    ? { x: exercise.externalId }
    : {
        n: exercise.name,
        m: exercise.muscleGroup,
        q: exercise.equipment,
        t: exercise.trackingType,
      };
}

export function parseSharedExercise(raw: unknown): SharedExercise | null {
  if (!isObject(raw)) return null;

  if ('x' in raw) return isText(raw.x) ? { x: raw.x } : null;

  if (!isText(raw.n) || !isText(raw.m) || !isText(raw.q)) return null;
  if (!TRACKING_TYPES.includes(raw.t as Exercise['trackingType'])) return null;

  return { n: raw.n.trim(), m: raw.m, q: raw.q, t: raw.t as Exercise['trackingType'] };
}
