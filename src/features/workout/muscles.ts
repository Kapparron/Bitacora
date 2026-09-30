import vocabulary from '@/data/vocabulary.json';
import type { WorkoutSet } from '@/db/schema';

import { countsTowardsVolume } from './volume';

/**
 * The six axes the muscles chart groups the catalogue's nineteen muscle groups
 * into, in the order they go round the hexagon. Chest sits opposite back, so a
 * push and pull imbalance shows as a lopsided shape without reading a number.
 * Both lists live in data/vocabulary.json.
 */
export const MUSCLE_AXES = vocabulary.muscleAxes;

export type MuscleAxis = (typeof MUSCLE_AXES)[number]['id'];

const AXIS_OF = new Map(
  vocabulary.muscles.map((muscle) => [muscle.es, muscle.axis as MuscleAxis | null])
);

/**
 * The axis a muscle group counts towards, or null when it counts towards none.
 *
 * Cardio and neck are left out on purpose: one is not a muscle and the other is
 * two exercises. So is any group the mapping does not know, which only happens
 * with one typed by hand for a custom exercise: it is not guessed at.
 */
export function axisOf(muscleGroup: string): MuscleAxis | null {
  return AXIS_OF.get(muscleGroup.trim().toLowerCase()) ?? null;
}

export type MuscleLoad = Record<MuscleAxis, number>;

type Entry = {
  exercise: { muscleGroup: string };
  sets: readonly Pick<WorkoutSet, 'completed' | 'type'>[];
};

/**
 * Working sets per axis. Sets rather than volume, so a bodyweight exercise
 * counts: by volume, core and pull-ups would hardly ever light up. Warm-ups and
 * unchecked sets count for nothing, the rule volume follows too.
 */
export function muscleLoad(entries: readonly Entry[]): MuscleLoad {
  const load = Object.fromEntries(MUSCLE_AXES.map((axis) => [axis.id, 0])) as MuscleLoad;

  for (const entry of entries) {
    const axis = axisOf(entry.exercise.muscleGroup);
    if (axis === null) continue;
    load[axis] += entry.sets.filter(countsTowardsVolume).length;
  }

  return load;
}

/* ------------------------------------------------------------ on the body */

const BODY_PART_OF = new Map(vocabulary.muscles.map((muscle) => [muscle.es, muscle.body]));

/**
 * Where on the drawn body a muscle group sits: a part name of
 * react-native-body-highlighter, as data/vocabulary.json maps it. Several
 * groups can share one part (lats and upper back are one area on the drawing).
 */
export function bodyPartOf(muscleGroup: string): string | null {
  return BODY_PART_OF.get(muscleGroup.trim().toLowerCase()) ?? null;
}

/**
 * Working sets needed for each shade, lightest first: a muscle touched with one
 * or two sets, one worked properly, one worked hard. Absolute rather than
 * relative to the session, so a light day looks light.
 */
export const BODY_SHADES = [1, 4, 8];

export type BodyPartLoad = { part: string; sets: number; shade: number };

/** Working sets per part of the body, with the shade each one earns. */
export function bodyLoad(entries: readonly Entry[]): BodyPartLoad[] {
  const sets = new Map<string, number>();

  for (const entry of entries) {
    const part = bodyPartOf(entry.exercise.muscleGroup);
    if (part === null) continue;

    const working = entry.sets.filter(countsTowardsVolume).length;
    if (working > 0) sets.set(part, (sets.get(part) ?? 0) + working);
  }

  return [...sets].map(([part, count]) => ({
    part,
    sets: count,
    shade: BODY_SHADES.filter((from) => count >= from).length,
  }));
}
