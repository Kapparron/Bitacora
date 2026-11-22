import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  formatPlan,
  movePlan,
  parsePlan,
  planOfLegacy,
  setsOfPlan,
  summaryOfPlan,
} from '@/features/routines/plan';
import { parseSharedRoutine, routineLink, type SharedRoutine } from '@/features/routines/share';

test('a plan is stored as text and read back, dropping what is unknown', () => {
  assert.deepEqual(parsePlan(null), []);
  assert.deepEqual(parsePlan('normal,drop,three_seven,normal'), [
    'normal',
    'drop',
    'three_seven',
    'normal',
  ]);
  assert.deepEqual(parsePlan('normal,warmup,,nope,drop'), ['normal', 'drop']);
  assert.equal(formatPlan([]), null);
  assert.equal(formatPlan(['normal', 'drop']), 'normal,drop');
});

test('a plan becomes sets in its own order: a 3/7 entry is five sets', () => {
  const sets = setsOfPlan(['normal', 'drop', 'three_seven', 'normal']);

  assert.deepEqual(
    sets.map((set) => [set.type, set.reps, set.restSeconds]),
    [
      ['normal', null, null],
      ['drop', null, null],
      ['three_seven', 3, 15],
      ['three_seven', 4, 15],
      ['three_seven', 5, 15],
      ['three_seven', 6, 15],
      ['three_seven', 7, 150],
      ['normal', null, null],
    ]
  );
});

test('an empty plan still starts with one set', () => {
  assert.deepEqual(setsOfPlan([]), [{ type: 'normal', reps: null, restSeconds: null }]);
});

test('moving an entry swaps it with its neighbour and stops at the ends', () => {
  const plan = ['normal', 'drop', 'three_seven'] as const;

  assert.deepEqual(movePlan(plan, 1, -1), ['drop', 'normal', 'three_seven']);
  assert.deepEqual(movePlan(plan, 1, 1), ['normal', 'three_seven', 'drop']);
  assert.deepEqual(movePlan(plan, 0, -1), [...plan]);
  assert.deepEqual(movePlan(plan, 2, 1), [...plan]);
});

test('the summary counts each kind', () => {
  assert.equal(summaryOfPlan(['normal', 'normal', 'drop', 'three_seven']), '2 series · 1 drop · 1 x 3/7');
  assert.equal(summaryOfPlan(['normal']), '1 serie');
});

test('a link from before plans becomes normal sets and then its extras', () => {
  assert.deepEqual(planOfLegacy(2, ['d', 't']), ['normal', 'normal', 'drop', 'three_seven']);
  assert.deepEqual(planOfLegacy(null, []), ['normal', 'normal', 'normal']);
});

const exercise = { e: { x: '0043' }, s: 3, r: null, d: 90, g: null, o: null };
const routine = (entry: object): SharedRoutine =>
  ({ v: 1, n: 'Pecho', o: null, e: [entry] }) as unknown as SharedRoutine;

test('a link from before plans still opens, with its sets and extras in a plan', () => {
  const parsed = parseSharedRoutine(routineLink(routine({ ...exercise, x: ['d'] })));

  assert.deepEqual(parsed?.e[0].p, ['n', 'n', 'n', 'd']);
});

test('the plan survives the link; an unknown or oversized one is refused', () => {
  const ok = parseSharedRoutine(routineLink(routine({ ...exercise, p: ['n', 'd', 't', 'n'] })));
  assert.deepEqual(ok?.e[0].p, ['n', 'd', 't', 'n']);

  assert.equal(parseSharedRoutine(routineLink(routine({ ...exercise, p: ['w'] }))), null);
  assert.equal(parseSharedRoutine(routineLink(routine({ ...exercise, p: [1] }))), null);
  assert.equal(parseSharedRoutine(routineLink(routine({ ...exercise, p: Array(31).fill('n') }))), null);
});

import { upgradeRow } from '@/features/backup/upgrade';

test('a backup row with a set count gets that many normal sets as its plan', () => {
  const old = { id: 'a', position: 0, targetSets: 2, targetReps: '8-12' };

  assert.deepEqual(upgradeRow('routineExercises', old), {
    id: 'a',
    position: 0,
    targetReps: '8-12',
    plan: 'normal,normal',
  });
  assert.equal(upgradeRow('routineExercises', { id: 'b', targetSets: null }).plan, 'normal,normal,normal');
});

test('rows that already carry a plan, or belong to another table, are left alone', () => {
  const current = { id: 'a', plan: 'normal,drop' };
  const other = { id: 'x', targetSets: 3 };

  assert.equal(upgradeRow('routineExercises', current), current);
  assert.equal(upgradeRow('sets', other), other);
});
