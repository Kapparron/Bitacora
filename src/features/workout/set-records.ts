/**
 * What a single set is worth against the records already stored. Kept apart from
 * the writing of those records, which opens the database: these functions are
 * pure, and the checks import them as they are.
 */
import { personalRecords, type WorkoutSet } from '@/db/schema';

import { countsTowardsVolume, estimatedOneRepMax, setVolume } from './volume';

export type RecordType = (typeof personalRecords.$inferSelect)['type'];

export const RECORD_LABEL: Record<RecordType, string> = {
  heaviest_weight: 'Peso maximo',
  estimated_1rm: '1RM estimado',
  best_set_volume: 'Mejor serie',
  session_volume: 'Volumen en sesion',
};

/** Records a single set can beat, in the order a bubble should announce them. */
const SET_RECORD_TYPES = ['estimated_1rm', 'best_set_volume'] as const;

export type SetRecordType = (typeof SET_RECORD_TYPES)[number];

/** Best value stored for an exercise, by record type. */
export type RecordValues = Partial<Record<RecordType, number>>;

/**
 * Which records a completed set reaches, measured against what is stored.
 *
 * Comparison is `>=`, so a set still wears its medal after the session is
 * finished and its own value has become the record. Warm-ups reach nothing, the
 * same rule the stored records follow.
 */
export function recordsReachedBy(
  set: Pick<WorkoutSet, 'completed' | 'type' | 'weight' | 'reps'>,
  records: RecordValues
): SetRecordType[] {
  if (!countsTowardsVolume(set) || set.weight === null || set.reps === null) return [];

  const reached: SetRecordType[] = [];

  const oneRepMax = estimatedOneRepMax(set.weight, set.reps);
  const best = records.estimated_1rm;
  if (oneRepMax > 0 && best !== undefined && oneRepMax >= best) reached.push('estimated_1rm');

  const volume = setVolume(set);
  const bestSet = records.best_set_volume;
  if (volume > 0 && bestSet !== undefined && volume >= bestSet) reached.push('best_set_volume');

  return reached;
}
