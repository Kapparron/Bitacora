import { and, asc, desc, eq, isNull, lte, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { useLiveTables } from '@/db/live';
import { foodEntries, foods, nutritionGoals, type Food, type FoodEntry } from '@/db/schema';

export type Meal = FoodEntry['meal'];

export const MEALS: { value: Meal; label: string }[] = [
  { value: 'breakfast', label: 'Desayuno' },
  { value: 'lunch', label: 'Comida' },
  { value: 'dinner', label: 'Cena' },
  { value: 'snack', label: 'Snacks' },
];

export type DayTotals = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type DayDiary = {
  entries: FoodEntry[];
  byMeal: Record<Meal, FoodEntry[]>;
  totals: DayTotals;
  mealTotals: Record<Meal, DayTotals>;
};

const NUTRITION_TABLES = ['food_entries', 'foods'] as const;

function emptyTotals(): DayTotals {
  return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
}

function add(totals: DayTotals, entry: FoodEntry): DayTotals {
  return {
    kcal: totals.kcal + entry.kcal,
    protein: totals.protein + (entry.protein ?? 0),
    carbs: totals.carbs + (entry.carbs ?? 0),
    fat: totals.fat + (entry.fat ?? 0),
  };
}

/** Everything logged on one local day, split by meal and summed. */
export function useDayDiary(date: string): { diary: DayDiary; loading: boolean } {
  const { data, loading } = useLiveTables(
    NUTRITION_TABLES,
    async () =>
      db
        .select()
        .from(foodEntries)
        .where(and(eq(foodEntries.date, date), isNull(foodEntries.deletedAt)))
        .orderBy(asc(foodEntries.createdAt)),
    [date]
  );

  const entries = data ?? [];

  const byMeal: Record<Meal, FoodEntry[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };

  const mealTotals: Record<Meal, DayTotals> = {
    breakfast: emptyTotals(),
    lunch: emptyTotals(),
    dinner: emptyTotals(),
    snack: emptyTotals(),
  };

  let totals = emptyTotals();

  for (const entry of entries) {
    byMeal[entry.meal].push(entry);
    mealTotals[entry.meal] = add(mealTotals[entry.meal], entry);
    totals = add(totals, entry);
  }

  return { diary: { entries, byMeal, totals, mealTotals }, loading };
}

/** Days with something logged, for marking the calendar. */
export function useLoggedDays(): Set<string> {
  const { data } = useLiveTables(
    ['food_entries'],
    async () =>
      db
        .selectDistinct({ date: foodEntries.date })
        .from(foodEntries)
        .where(isNull(foodEntries.deletedAt)),
    []
  );

  return new Set((data ?? []).map((row) => row.date));
}

/**
 * The goal in force on a date. Goals are versioned by start date, so a past day
 * keeps the goal it was judged against instead of the current one.
 */
export function useGoalFor(date: string): typeof nutritionGoals.$inferSelect | null {
  const { data } = useLiveTables(
    ['nutrition_goals'],
    async () =>
      db
        .select()
        .from(nutritionGoals)
        .where(and(lte(nutritionGoals.effectiveFrom, date), isNull(nutritionGoals.deletedAt)))
        .orderBy(desc(nutritionGoals.effectiveFrom))
        .limit(1),
    [date]
  );

  return data?.at(0) ?? null;
}

/**
 * Foods to offer before the user types anything: their own first, then whatever
 * they logged most often. Both come from the local cache, so this works offline.
 */
export function useSuggestedFoods(): { favorites: Food[]; recents: Food[] } {
  const { data } = useLiveTables(
    NUTRITION_TABLES,
    async () => {
      const favorites = await db
        .select()
        .from(foods)
        .where(and(eq(foods.isFavorite, true), isNull(foods.deletedAt)))
        .orderBy(asc(foods.name));

      const recents = await db
        .select({ food: foods, lastUsed: sql<number>`max(${foodEntries.createdAt})` })
        .from(foodEntries)
        .innerJoin(foods, eq(foods.id, foodEntries.foodId))
        .where(isNull(foods.deletedAt))
        .groupBy(foods.id)
        .orderBy(desc(sql`max(${foodEntries.createdAt})`))
        .limit(20);

      return { favorites, recents: recents.map((row) => row.food) };
    },
    []
  );

  return data ?? { favorites: [], recents: [] };
}

/** Calories logged per day, for the workout tab's calendar. */
export function useDailyKcal(): Map<string, number> {
  const { data } = useLiveTables(
    ['food_entries'],
    async () =>
      db
        .select({ date: foodEntries.date, kcal: sql<number>`sum(${foodEntries.kcal})` })
        .from(foodEntries)
        .where(isNull(foodEntries.deletedAt))
        .groupBy(foodEntries.date),
    []
  );

  return new Map((data ?? []).map((row) => [row.date, row.kcal]));
}

/**
 * Every food already known locally: cached Open Food Facts products and the
 * user's own. The search box looks here before it goes near the network.
 */
export function useLocalFoods(): Food[] {
  const { data } = useLiveTables(
    ['foods'],
    async () =>
      db
        .select()
        .from(foods)
        .where(isNull(foods.deletedAt))
        .orderBy(desc(foods.isFavorite), asc(foods.name)),
    []
  );

  return data ?? [];
}

export function useCustomFoods(): Food[] {
  const { data } = useLiveTables(
    ['foods'],
    async () =>
      db
        .select()
        .from(foods)
        .where(and(eq(foods.source, 'custom'), isNull(foods.deletedAt)))
        .orderBy(asc(foods.name)),
    []
  );

  return data ?? [];
}

export async function findFoodByBarcode(barcode: string): Promise<Food | null> {
  const [found] = await db
    .select()
    .from(foods)
    .where(and(eq(foods.barcode, barcode), isNull(foods.deletedAt)))
    .limit(1);

  return found ?? null;
}

export async function getEntry(entryId: string): Promise<FoodEntry | null> {
  const [found] = await db.select().from(foodEntries).where(eq(foodEntries.id, entryId)).limit(1);
  return found ?? null;
}

export async function getFood(foodId: string): Promise<Food | null> {
  const [found] = await db.select().from(foods).where(eq(foods.id, foodId)).limit(1);
  return found ?? null;
}
