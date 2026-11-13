import type { FoodEntry, MealRow } from '@/db/schema';

/** A meal as the diary and the pickers use it. */
export type MealInfo = { id: string; name: string; hidden: boolean };

/**
 * The four meals the app started with. Their ids are what `food_entries.meal`
 * has always held, so an entry logged before meals were editable already points
 * at one of them. The migration inserts these rows; this list covers a database
 * where the table is empty, as after restoring a backup written before it
 * existed or after wiping the data.
 */
export const DEFAULT_MEALS: readonly MealInfo[] = [
  { id: 'breakfast', name: 'Desayuno', hidden: false },
  { id: 'lunch', name: 'Comida', hidden: false },
  { id: 'dinner', name: 'Cena', hidden: false },
  { id: 'snack', name: 'Snacks', hidden: false },
];

/** Rows of `meals`, in the order the diary lists them, without the deleted. */
export function mealsOf(rows: readonly MealRow[]): MealInfo[] {
  if (rows.length === 0) return [...DEFAULT_MEALS];

  return rows
    .filter((row) => row.deletedAt === null)
    .sort((a, b) => a.position - b.position)
    .map((row) => ({ id: row.id, name: row.name, hidden: row.hidden }));
}

/**
 * The meals to draw for a day: the visible ones in order, plus any hidden meal
 * that still has something logged on that day (hiding must never make food
 * vanish from the totals), plus an "Otros" for entries whose meal no longer
 * exists.
 */
export function mealsForDay(
  meals: readonly MealInfo[],
  entries: readonly FoodEntry[]
): MealInfo[] {
  const used = new Set(entries.map((entry) => entry.meal));
  const shown = meals.filter((meal) => !meal.hidden || used.has(meal.id));
  const known = new Set(meals.map((meal) => meal.id));

  return used.size > 0 && [...used].some((id) => !known.has(id))
    ? [...shown, { id: ORPHAN_MEAL, name: 'Otros', hidden: false }]
    : shown;
}

/** Stands for every entry whose meal was deleted. */
export const ORPHAN_MEAL = '__otros__';

/** The meal an entry is listed under, `ORPHAN_MEAL` when its own is gone. */
export function sectionOf(entry: FoodEntry, meals: readonly MealInfo[]): string {
  return meals.some((meal) => meal.id === entry.meal) ? entry.meal : ORPHAN_MEAL;
}

/** Trimmed, and null for a blank or already used name. */
export function cleanMealName(name: string, others: readonly MealInfo[]): string | null {
  const trimmed = name.trim();
  if (trimmed === '') return null;

  const taken = others.some((meal) => meal.name.toLowerCase() === trimmed.toLowerCase());

  return taken ? null : trimmed;
}
