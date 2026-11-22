import type { SetType } from '@/constants/sets';

/** The 3/7 method: mini-sets of these reps, and the rests that go with them. */
export const THREE_SEVEN_REPS = [3, 4, 5, 6, 7] as const;
export const THREE_SEVEN_MINI_REST_S = 15;
export const THREE_SEVEN_SERIES_REST_S = 150;

/** The rest that follows each mini-set of one 3/7 series: 15 s, then 2.5 min. */
export const THREE_SEVEN_RESTS = THREE_SEVEN_REPS.map((_, index) =>
  index === THREE_SEVEN_REPS.length - 1 ? THREE_SEVEN_SERIES_REST_S : THREE_SEVEN_MINI_REST_S
);

/** Each drop is a fifth lighter than the set before it. */
const DROP_FACTOR = 0.8;

/** Seconds of rest to start once `sets[index]` is completed; 0 means none. */
export function restAfter(
  sets: readonly { type: SetType; restSeconds: number | null }[],
  index: number,
  exerciseRest: number | null
): number {
  // A drop set is done straight after the set before it, with no pause.
  if (sets[index + 1]?.type === 'drop') return 0;

  return sets[index].restSeconds ?? exerciseRest ?? 0;
}

/** Weight suggested for the set after a drop, to the nearest half kilo. */
export function dropWeight(weight: number): number {
  return Math.round(weight * DROP_FACTOR * 2) / 2;
}

/**
 * Whether the exercise at `index` closes its superset, which is when the rest
 * starts: the ones before it in the group are followed straight by the next
 * exercise. An exercise that is in no superset closes itself.
 */
export function closesSuperset(groups: readonly (number | null)[], index: number): boolean {
  const group = groups[index];
  if (group === null) return true;

  return !groups.slice(index + 1).includes(group);
}
