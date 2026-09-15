import vocabulary from '@/data/vocabulary.json';

/**
 * Catalogue equipment spelled as a variant of a broader one, read from
 * `data/vocabulary.json`: the filter offers only the broader name, so "barra"
 * also finds the Olympic and hex bars. The EZ bar keeps its own entry there —
 * it has enough exercises to be worth picking alone.
 *
 * The same file is what `scripts/build-exercise-catalog.mjs` translates the
 * upstream names with, so a piece of equipment is named and grouped in one
 * place.
 */
const EQUIPMENT_FAMILIES: Record<string, string> = Object.fromEntries(
  vocabulary.equipment
    .filter((item): item is typeof item & { family: string } => 'family' in item)
    .map((item) => [item.es, item.family])
);

/** The equipment name the filter groups an exercise under. */
export function equipmentFamily(equipment: string): string {
  return EQUIPMENT_FAMILIES[equipment] ?? equipment;
}

export type ExerciseFilters = {
  /** Exact muscle group; null means every group. */
  muscleGroup: string | null;
  /** Equipment family, as returned by `equipmentFamily`; null means any. */
  equipment: string | null;
};

type Filterable = { muscleGroup: string; equipment: string };

export function matchesFilters(exercise: Filterable, filters: ExerciseFilters): boolean {
  return (
    (filters.muscleGroup === null || exercise.muscleGroup === filters.muscleGroup) &&
    (filters.equipment === null || equipmentFamily(exercise.equipment) === filters.equipment)
  );
}

/**
 * How many exercises each option of one filter would leave, given the other
 * filter. Sorted alphabetically: with the count beside each name, the order no
 * longer has to say which options are the big ones.
 */
export function filterCounts<T extends Filterable>(
  items: readonly T[],
  field: keyof ExerciseFilters,
  filters: ExerciseFilters
): [name: string, count: number][] {
  // Every option is counted as if it were the one chosen, so the field's own
  // current value must not narrow the list.
  const others = { ...filters, [field]: null };
  const counts = new Map<string, number>();

  for (const item of items) {
    const name = field === 'equipment' ? equipmentFamily(item.equipment) : item.muscleGroup;
    const count = counts.get(name) ?? 0;
    counts.set(name, matchesFilters(item, others) ? count + 1 : count);
  }

  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'));
}
