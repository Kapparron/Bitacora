import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  dropWeight,
  restAfter,
  THREE_SEVEN_REPS,
  THREE_SEVEN_RESTS,
} from '@/features/workout/rest-after';

const normal = { type: 'normal', restSeconds: null } as const;
const drop = { type: 'drop', restSeconds: null } as const;

test('a set rests for the exercise rest by default', () => {
  assert.equal(restAfter([normal, normal], 0, 90), 90);
  assert.equal(restAfter([normal], 0, null), 0);
});

test('no rest before a drop set, and the rest comes after the last drop', () => {
  const sets = [normal, drop, drop];

  assert.equal(restAfter(sets, 0, 90), 0);
  assert.equal(restAfter(sets, 1, 90), 0);
  assert.equal(restAfter(sets, 2, 90), 90);
});

test("a set's own rest wins over the exercise rest", () => {
  assert.equal(restAfter([{ type: 'normal', restSeconds: 15 }, normal], 0, 90), 15);
});

test('a 3/7 series is 3 to 7 reps with 15 s between and 2.5 min at the end', () => {
  assert.deepEqual([...THREE_SEVEN_REPS], [3, 4, 5, 6, 7]);
  assert.deepEqual([...THREE_SEVEN_RESTS], [15, 15, 15, 15, 150]);
});

test('a drop goes to four fifths of the weight, to the half kilo', () => {
  assert.equal(dropWeight(100), 80);
  assert.equal(dropWeight(62.5), 50);
  assert.equal(dropWeight(27), 21.5);
});
