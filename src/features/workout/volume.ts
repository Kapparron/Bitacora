import type { WorkoutSet } from '@/db/schema';

/**
 * Only completed working sets count. Warm-up sets are excluded because counting
 * them would inflate volume and hide real progression.
 */
export function countsTowardsVolume(set: Pick<WorkoutSet, 'completed' | 'type'>): boolean {
  return set.completed && set.type !== 'warmup';
}

/** Weight times reps, in kilograms. Zero for sets that carry no load. */
export function setVolume(set: Pick<WorkoutSet, 'weight' | 'reps'>): number {
  if (set.weight === null || set.reps === null) return 0;
  return set.weight * set.reps;
}

export function totalVolume(sets: readonly WorkoutSet[]): number {
  return sets.reduce((sum, set) => (countsTowardsVolume(set) ? sum + setVolume(set) : sum), 0);
}

export function completedSetCount(sets: readonly WorkoutSet[]): number {
  return sets.filter((set) => set.completed).length;
}

/**
 * Epley formula. It is a rough estimate that breaks down above ~12 reps, so it
 * is only used for the "estimated 1RM" record, never to prescribe a load.
 */
export function estimatedOneRepMax(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}
