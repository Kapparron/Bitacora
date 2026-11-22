import { DEFAULT_PLAN, formatPlan } from '@/features/routines/plan';

/**
 * Brings a row of a backup written by an older version up to what the tables
 * hold now. Rows that need nothing come back as they were.
 *
 * Routine exercises used to say how many sets they planned in `targetSets`;
 * they now carry the ordered `plan`, so an old row's count becomes that many
 * normal sets.
 */
export function upgradeRow(table: string, row: Record<string, unknown>): Record<string, unknown> {
  if (table !== 'routineExercises' || row.plan != null || !('targetSets' in row)) return row;

  const count = typeof row.targetSets === 'number' ? Math.max(1, row.targetSets) : DEFAULT_PLAN.length;
  const { targetSets: _targetSets, ...rest } = row;

  return { ...rest, plan: formatPlan(Array.from({ length: count }, () => 'normal' as const)) };
}
