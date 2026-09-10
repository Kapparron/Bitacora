import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { newId } from '@/db/ids';
import { foodEntries, foods, nutritionGoals, type Food } from '@/db/schema';
import type { OffProduct } from './openfoodfacts';
import type { Meal } from './queries';

const touch = () => ({ updatedAt: Date.now() });

/**
 * Saves an Open Food Facts product in the local cache, or refreshes the copy
 * that is already there. Everything logged later reads from this row, so the
 * network is only needed the first time a product is seen.
 */
export async function cacheProduct(product: OffProduct): Promise<Food> {
  const [existing] = await db.select().from(foods).where(eq(foods.barcode, product.barcode));

  const values = {
    barcode: product.barcode,
    name: product.name,
    brand: product.brand,
    source: 'openfoodfacts' as const,
    kcalPer100g: product.kcalPer100g,
    proteinPer100g: product.proteinPer100g,
    carbsPer100g: product.carbsPer100g,
    fatPer100g: product.fatPer100g,
    fiberPer100g: product.fiberPer100g,
    sugarPer100g: product.sugarPer100g,
    saltPer100g: product.saltPer100g,
    servingSizeG: product.servingSizeG,
    imageUrl: product.imageUrl,
    fetchedAt: Date.now(),
  };

  if (existing) {
    await db
      .update(foods)
      .set({ ...values, ...touch() })
      .where(eq(foods.id, existing.id));

    return { ...existing, ...values };
  }

  const id = newId();
  await db.insert(foods).values({ id, ...values });

  const [inserted] = await db.select().from(foods).where(eq(foods.id, id));
  return inserted;
}

export type CustomFoodInput = {
  name: string;
  brand: string | null;
  kcalPer100g: number;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
  servingSizeG: number | null;
};

export async function createCustomFood(input: CustomFoodInput): Promise<Food> {
  const id = newId();
  await db.insert(foods).values({ id, source: 'custom', ...input });

  const [inserted] = await db.select().from(foods).where(eq(foods.id, id));
  return inserted;
}

export async function updateFood(foodId: string, patch: Partial<CustomFoodInput>): Promise<void> {
  await db
    .update(foods)
    .set({ ...patch, ...touch() })
    .where(eq(foods.id, foodId));
}

/**
 * Soft delete: the food leaves every list, but entries that point at it keep
 * their own frozen values, and the history stays readable.
 */
export async function deleteFood(foodId: string): Promise<void> {
  await db
    .update(foods)
    .set({ deletedAt: Date.now(), ...touch() })
    .where(eq(foods.id, foodId));
}

export async function toggleFavorite(foodId: string, isFavorite: boolean): Promise<void> {
  await db
    .update(foods)
    .set({ isFavorite, ...touch() })
    .where(eq(foods.id, foodId));
}

/** Rounds to one decimal; anything finer is noise on a food label. */
function scale(per100g: number | null, grams: number): number | null {
  if (per100g === null) return null;
  return Math.round(((per100g * grams) / 100) * 10) / 10;
}

/**
 * Logs a food. The macros are computed here and stored on the entry rather than
 * looked up later: Open Food Facts is crowd-sourced, and a correction upstream
 * must not rewrite what a past day says was eaten.
 */
export async function logFood(input: {
  date: string;
  meal: Meal;
  food: Food;
  grams: number;
}): Promise<void> {
  const { date, meal, food, grams } = input;

  await db.insert(foodEntries).values({
    id: newId(),
    date,
    meal,
    foodId: food.id,
    name: food.name,
    brand: food.brand,
    grams,
    kcal: Math.round((food.kcalPer100g * grams) / 100),
    protein: scale(food.proteinPer100g, grams),
    carbs: scale(food.carbsPer100g, grams),
    fat: scale(food.fatPer100g, grams),
  });
}

/** Changing the amount recomputes the entry from the food it came from. */
export async function updateEntryAmount(entryId: string, grams: number): Promise<void> {
  const [entry] = await db.select().from(foodEntries).where(eq(foodEntries.id, entryId));
  if (!entry) return;

  const [food] = entry.foodId
    ? await db.select().from(foods).where(eq(foods.id, entry.foodId))
    : [undefined];

  // With the food gone, scale the entry's own frozen values instead.
  const factor = grams / entry.grams;

  const values = food
    ? {
        grams,
        kcal: Math.round((food.kcalPer100g * grams) / 100),
        protein: scale(food.proteinPer100g, grams),
        carbs: scale(food.carbsPer100g, grams),
        fat: scale(food.fatPer100g, grams),
      }
    : {
        grams,
        kcal: Math.round(entry.kcal * factor),
        protein: entry.protein === null ? null : Math.round(entry.protein * factor * 10) / 10,
        carbs: entry.carbs === null ? null : Math.round(entry.carbs * factor * 10) / 10,
        fat: entry.fat === null ? null : Math.round(entry.fat * factor * 10) / 10,
      };

  await db
    .update(foodEntries)
    .set({ ...values, ...touch() })
    .where(eq(foodEntries.id, entryId));
}

export async function moveEntry(entryId: string, meal: Meal): Promise<void> {
  await db
    .update(foodEntries)
    .set({ meal, ...touch() })
    .where(eq(foodEntries.id, entryId));
}

export async function deleteEntry(entryId: string): Promise<void> {
  await db.delete(foodEntries).where(eq(foodEntries.id, entryId));
}

/**
 * Sets the goal from `effectiveFrom` onwards. Editing today's goal replaces the
 * row that already starts today; setting it on a later date leaves the old one
 * in place, so past days keep the goal they were judged against.
 */
export async function setGoal(input: {
  effectiveFrom: string;
  kcal: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}): Promise<void> {
  const [existing] = await db
    .select()
    .from(nutritionGoals)
    .where(eq(nutritionGoals.effectiveFrom, input.effectiveFrom));

  if (existing) {
    await db
      .update(nutritionGoals)
      .set({ ...input, ...touch() })
      .where(eq(nutritionGoals.id, existing.id));
    return;
  }

  await db.insert(nutritionGoals).values({ id: newId(), ...input });
}
