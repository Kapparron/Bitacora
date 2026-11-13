import { useMemo } from 'react';
import { and, asc, desc, eq, isNull, lte, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { useLiveTables } from '@/db/live';
import {
  foodEntries,
  foods,
  meals as mealsTable,
  nutritionGoals,
  type Food,
  type FoodEntry,
} from '@/db/schema';

import { DEFAULT_MEALS, mealsOf, sectionOf, type MealInfo } from './meals';

/** The id of a meal, as stored in `food_entries.meal`. */
export type Meal = string;

export type DayTotals = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type DayDiary = {
  entries: FoodEntry[];
  /** Entries by meal id. A meal with nothing logged has no key. */
  byMeal: Record<string, FoodEntry[]>;
  totals: DayTotals;
  mealTotals: Record<string, DayTotals>;
};

const NUTRITION_TABLES = ['food_entries', 'foods'] as const;

// What a hook returns before its first result: the same object every time.
const NO_FOODS: Food[] = [];
const NO_DATES = new Set<string>();
const NO_KCAL = new Map<string, number>();
const NO_SUGGESTIONS = { favorites: NO_FOODS, recents: NO_FOODS };

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

/**
 * Everything logged on one local day, split by meal and summed. An entry keeps
 * its own copy of the food's name and values, so only `food_entries` is read.
 */
export function useDayDiary(date: string): { diary: DayDiary; loading: boolean } {
  const meals = useMeals();
  const { data, loading } = useLiveTables(
    'useDayDiary',
    ['food_entries'],
    async () =>
      db
        .select()
        .from(foodEntries)
        .where(and(eq(foodEntries.date, date), isNull(foodEntries.deletedAt)))
        .orderBy(asc(foodEntries.createdAt)),
    [date]
  );

  const diary = useMemo(() => (data ? diaryOf(data, meals) : EMPTY_DIARY), [data, meals]);

  return { diary, loading };
}

/**
 * Entries are filed under their meal's id; one whose meal was deleted goes under
 * `ORPHAN_MEAL`, so it still counts in the totals and shows in the diary.
 */
export function diaryOf(entries: FoodEntry[], meals: readonly MealInfo[] = DEFAULT_MEALS): DayDiary {
  const byMeal: Record<string, FoodEntry[]> = {};
  const mealTotals: Record<string, DayTotals> = {};
  let totals = emptyTotals();

  for (const entry of entries) {
    const key = sectionOf(entry, meals);
    (byMeal[key] ??= []).push(entry);
    mealTotals[key] = add(mealTotals[key] ?? emptyTotals(), entry);
    totals = add(totals, entry);
  }

  return { entries, byMeal, totals, mealTotals };
}

const EMPTY_DIARY = diaryOf([]);

const NO_MEALS: MealInfo[] = [...DEFAULT_MEALS];

/** The meals in the order the diary lists them, hidden ones included. */
export function useMeals(): MealInfo[] {
  const { data } = useLiveTables(
    'useMeals',
    ['meals'],
    async () => mealsOf(await db.select().from(mealsTable)),
    []
  );

  return data ?? NO_MEALS;
}

/** Days with something logged, for marking the calendar. */
export function useLoggedDays(): Set<string> {
  const { data } = useLiveTables(
    'useLoggedDays',
    ['food_entries'],
    async () => {
      const rows = await db
        .selectDistinct({ date: foodEntries.date })
        .from(foodEntries)
        .where(isNull(foodEntries.deletedAt));

      return new Set(rows.map((row) => row.date));
    },
    []
  );

  return data ?? NO_DATES;
}

/**
 * The goal in force on a date. Goals are versioned by start date, so a past day
 * keeps the goal it was judged against instead of the current one.
 */
export function useGoalFor(date: string): typeof nutritionGoals.$inferSelect | null {
  const { data } = useLiveTables(
    'useGoalFor',
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
    'useSuggestedFoods',
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

  return data ?? NO_SUGGESTIONS;
}

/** Calories logged per day, for the workout tab's calendar. */
export function useDailyKcal(): Map<string, number> {
  const { data } = useLiveTables(
    'useDailyKcal',
    ['food_entries'],
    async () => {
      const rows = await db
        .select({ date: foodEntries.date, kcal: sql<number>`sum(${foodEntries.kcal})` })
        .from(foodEntries)
        .where(isNull(foodEntries.deletedAt))
        .groupBy(foodEntries.date);

      return new Map(rows.map((row) => [row.date, row.kcal]));
    },
    []
  );

  return data ?? NO_KCAL;
}

/**
 * Every food already known locally: cached Open Food Facts products and the
 * user's own. The search box looks here before it goes near the network.
 */
export function useLocalFoods(): Food[] {
  const { data } = useLiveTables(
    'useLocalFoods',
    ['foods'],
    async () =>
      db
        .select()
        .from(foods)
        .where(isNull(foods.deletedAt))
        .orderBy(desc(foods.isFavorite), asc(foods.name)),
    []
  );

  return data ?? NO_FOODS;
}

export function useCustomFoods(): Food[] {
  const { data } = useLiveTables(
    'useCustomFoods',
    ['foods'],
    async () =>
      db
        .select()
        .from(foods)
        .where(and(eq(foods.source, 'custom'), isNull(foods.deletedAt)))
        .orderBy(asc(foods.name)),
    []
  );

  return data ?? NO_FOODS;
}

export async function findFoodByBarcode(barcode: string): Promise<Food | null> {
  const [found] = await db
    .select()
    .from(foods)
    .where(and(eq(foods.barcode, barcode), isNull(foods.deletedAt)))
    .limit(1);

  return found ?? null;
}

/** One diary entry, or null when there is none to read. */
export function useFoodEntry(entryId: string | null): FoodEntry | null {
  const { data } = useLiveTables(
    'useFoodEntry',
    ['food_entries'],
    async () => {
      if (entryId === null) return null;
      const [found] = await db.select().from(foodEntries).where(eq(foodEntries.id, entryId)).limit(1);
      return found ?? null;
    },
    [entryId]
  );

  return data ?? null;
}

/**
 * One food, deleted or not: an entry still opens the food it was logged from.
 * Read live, so marking it as a favourite shows at once.
 */
export function useFood(foodId: string | null): Food | null {
  const { data } = useLiveTables(
    'useFood',
    ['foods'],
    async () => {
      if (foodId === null) return null;
      const [found] = await db.select().from(foods).where(eq(foods.id, foodId)).limit(1);
      return found ?? null;
    },
    [foodId]
  );

  return data ?? null;
}
