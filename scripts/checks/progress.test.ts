import assert from 'node:assert/strict';
import { test } from 'node:test';

import { estimateGoal } from '@/features/nutrition/calorie-goal';
import { progressFor, tierFor } from '@/features/progress/streak';
import { isRestDay, parseRestWeekdays, serializeRestWeekdays } from '@/features/rest/rest';
import { estimatedOneRepMax, countsTowardsVolume, totalVolume } from '@/features/workout/volume';
import type { WorkoutSet } from '@/db/schema';

function set(overrides: Partial<WorkoutSet>): WorkoutSet {
  return {
    id: 's',
    workoutExerciseId: 'we',
    position: 0,
    type: 'normal',
    weight: null,
    reps: null,
    rpe: null,
    distanceM: null,
    durationS: null,
    completed: true,
    notes: null,
    createdAt: 0,
    updatedAt: 0,
    deletedAt: null,
    ...overrides,
  } as WorkoutSet;
}

test('only a set marked as warm-up is left out of the volume', () => {
  const sets = [
    set({ id: 'a', weight: 60, reps: 10 }),
    set({ id: 'b', weight: 60, reps: 10 }),
    set({ id: 'c', weight: 40, reps: 10, type: 'warmup' }),
    set({ id: 'd', weight: 60, reps: 10, completed: false }),
  ];

  assert.equal(totalVolume(sets), 1200);
  assert.equal(countsTowardsVolume(sets[0]), true);
  assert.equal(countsTowardsVolume(sets[2]), false);
});

test('the one-rep max estimate holds at its edges', () => {
  assert.equal(estimatedOneRepMax(100, 1), 100);
  assert.equal(estimatedOneRepMax(0, 10), 0);
  assert.equal(Math.round(estimatedOneRepMax(100, 10)), 133);
});

test('a streak tier steps at its own mark', () => {
  assert.equal(tierFor(0), null);
  assert.equal(tierFor(1)?.from, 1);
  assert.equal(tierFor(6)?.from, 3);
  assert.equal(tierFor(7)?.from, 7);
  assert.equal(tierFor(999)?.from, 100);
});

test('the ring fills from the previous mark, not from zero', () => {
  assert.deepEqual(progressFor(0), { remaining: 3, next: 3, ratio: 0 });
  assert.equal(progressFor(29).next, 30);
  assert.equal(progressFor(29).remaining, 1);
  assert.ok(progressFor(29).ratio > 0.9, 'a un dia de la marca el anillo va casi lleno');
  assert.equal(progressFor(30).ratio, 0, 'recien alcanzada, el anillo vuelve a empezar');
  assert.deepEqual(progressFor(400), { remaining: null, next: null, ratio: 1 });
});

test('the calorie goal follows Mifflin-St Jeor and the weekly change', () => {
  const maintain = estimateGoal({
    sex: 'male',
    age: 30,
    heightCm: 180,
    weightKg: 80,
    activity: 'moderate',
    weeklyChangeKg: 0,
  });

  // 10*80 + 6.25*180 - 5*30 + 5 = 1780, times 1.55.
  assert.equal(maintain.bmr, 1780);
  assert.equal(maintain.maintenance, 2759);
  assert.equal(maintain.kcal, 2759);
  assert.equal(maintain.clamped, false);

  const cutting = estimateGoal({
    sex: 'male',
    age: 30,
    heightCm: 180,
    weightKg: 80,
    activity: 'moderate',
    weeklyChangeKg: -0.5,
  });

  // Half a kilogram a week is 7700/2 spread over seven days: 550 a day.
  assert.equal(cutting.kcal, maintain.kcal - 550);
  assert.equal(cutting.protein, 160);
  assert.equal(cutting.fat, 72);
});

test('an impossible weekly loss is clamped instead of obeyed', () => {
  const estimate = estimateGoal({
    sex: 'female',
    age: 25,
    heightCm: 165,
    weightKg: 60,
    activity: 'sedentary',
    weeklyChangeKg: -1,
  });

  assert.equal(estimate.clamped, true);
  assert.equal(estimate.kcal, Math.round(estimate.bmr * 1.1));
});

test('rest days come from the weekly rule and from the marked ones', () => {
  const plan = { weekdays: new Set([2]), days: new Set(['2026-09-12']) };

  assert.equal(isRestDay(plan, '2026-09-09'), true, 'un miercoles');
  assert.equal(isRestDay(plan, '2026-09-10'), false);
  assert.equal(isRestDay(plan, '2026-09-12'), true, 'marcado a mano');
});

test('the weekly rest days survive being written and read back', () => {
  assert.equal(serializeRestWeekdays([6, 2, 2]), '2,6');
  assert.deepEqual([...parseRestWeekdays('2,6')], [2, 6]);
  assert.deepEqual([...parseRestWeekdays(null)], []);
  assert.deepEqual([...parseRestWeekdays('9,x,3')], [3], 'lo que no es un dia se descarta');
});
