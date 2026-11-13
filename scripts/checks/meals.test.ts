import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { FoodEntry, MealRow } from '@/db/schema';
import { diaryOf } from '@/features/nutrition/queries';
import {
  cleanMealName,
  DEFAULT_MEALS,
  mealsForDay,
  mealsOf,
  ORPHAN_MEAL,
} from '@/features/nutrition/meals';

const row = (id: string, position: number, extra: Partial<MealRow> = {}): MealRow => ({
  id,
  name: id,
  position,
  hidden: false,
  createdAt: 0,
  updatedAt: 0,
  deletedAt: null,
  ...extra,
});

const entry = (id: string, meal: string, kcal = 100): FoodEntry =>
  ({ id, meal, kcal, grams: 100, protein: null, carbs: null, fat: null, name: id }) as FoodEntry;

test('an empty meals table reads as the four starting meals', () => {
  assert.deepEqual(mealsOf([]), [...DEFAULT_MEALS]);
});

test('meals come back in position order, without the deleted ones', () => {
  const meals = mealsOf([
    row('b', 2),
    row('a', 0),
    row('gone', 1, { deletedAt: 5 }),
    row('hid', 3, { hidden: true }),
  ]);

  assert.deepEqual(
    meals.map((meal) => meal.id),
    ['a', 'b', 'hid']
  );
  assert.equal(meals[2].hidden, true);
});

test('a hidden meal still shows on a day that has food in it', () => {
  const meals = mealsOf([row('a', 0), row('hid', 1, { hidden: true })]);

  assert.deepEqual(
    mealsForDay(meals, [entry('e1', 'a')]).map((meal) => meal.id),
    ['a']
  );
  assert.deepEqual(
    mealsForDay(meals, [entry('e1', 'hid')]).map((meal) => meal.id),
    ['a', 'hid']
  );
});

test('food in a deleted meal goes under "Otros" and still counts', () => {
  const meals = mealsOf([row('a', 0)]);
  const entries = [entry('e1', 'a', 200), entry('e2', 'lost', 50)];
  const diary = diaryOf(entries, meals);

  assert.equal(diary.totals.kcal, 250);
  assert.equal(diary.mealTotals.a.kcal, 200);
  assert.equal(diary.mealTotals[ORPHAN_MEAL].kcal, 50);
  assert.deepEqual(
    mealsForDay(meals, entries).map((meal) => meal.id),
    ['a', ORPHAN_MEAL]
  );
});

test('entries logged before meals were editable keep their meal', () => {
  const diary = diaryOf([entry('e1', 'breakfast', 300), entry('e2', 'snack', 80)]);

  assert.equal(diary.mealTotals.breakfast.kcal, 300);
  assert.equal(diary.mealTotals.snack.kcal, 80);
  assert.equal(diary.byMeal[ORPHAN_MEAL], undefined);
});

test('a meal name is trimmed, and a blank or repeated one is refused', () => {
  const others = [...DEFAULT_MEALS];

  assert.equal(cleanMealName('  Merienda ', others), 'Merienda');
  assert.equal(cleanMealName('   ', others), null);
  assert.equal(cleanMealName('cena', others), null, 'sin distinguir mayusculas');
});
