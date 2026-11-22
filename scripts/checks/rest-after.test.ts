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

test('a 3/7 set has its own badge, counts for the volume and travels as a letter', async () => {
  const { badgeOf, codeOf, countsForVolume, typeOfCode } = await import('@/constants/sets');

  assert.equal(badgeOf('three_seven'), '3/7');
  assert.equal(countsForVolume('three_seven'), true);
  assert.equal(typeOfCode(codeOf('three_seven')), 'three_seven');
});

import { chainsOf } from '@/features/workout/set-chains';

const seven = (restSeconds: number) => ({ type: 'three_seven', restSeconds }) as const;

test('a set and its drops are one chain, the next set starts another', () => {
  assert.deepEqual(chainsOf([normal, drop, drop, normal, normal]), [[0, 1, 2], [3], [4]]);
});

test('two 3/7 series are two chains, split by the long rest', () => {
  const series = [seven(15), seven(15), seven(15), seven(15), seven(150)];

  assert.deepEqual(chainsOf([...series, ...series]), [
    [0, 1, 2, 3, 4],
    [5, 6, 7, 8, 9],
  ]);
});

test('plain sets are chains of one, and drops at the start still chain together', () => {
  assert.deepEqual(chainsOf([normal, normal]), [[0], [1]]);
  assert.deepEqual(chainsOf([drop, drop]), [[0, 1]]);
  assert.deepEqual(chainsOf([]), []);
});

test('drops and 3/7 sets take no number, so the next set continues the count', async () => {
  const { badgeFor } = await import('@/features/workout/set-badge');
  const types = ['normal', 'drop', 'normal', 'drop', 'three_seven', 'normal'] as const;
  const sets = types.map((type) => ({ type }));

  assert.deepEqual(
    sets.map((_, index) => badgeFor(sets, index)),
    ['1', 'D', '2', 'D', '3/7', '3']
  );
});
