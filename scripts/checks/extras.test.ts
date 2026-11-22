import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatExtras, parseExtras, setsOfExtras } from '@/features/routines/extras';
import { parseSharedRoutine, routineLink, type SharedRoutine } from '@/features/routines/share';

test('extras are stored as text and read back, dropping what is unknown', () => {
  assert.deepEqual(parseExtras(null), []);
  assert.deepEqual(parseExtras('drop,three_seven,drop'), ['drop', 'three_seven', 'drop']);
  assert.deepEqual(parseExtras('drop,warmup,,nope'), ['drop']);
  assert.equal(formatExtras([]), null);
  assert.equal(formatExtras(['drop', 'three_seven']), 'drop,three_seven');
});

test('a drop is one set and a 3/7 series is five, with their own rests', () => {
  assert.deepEqual(setsOfExtras(['drop']), [{ type: 'drop', reps: null, restSeconds: null }]);

  const series = setsOfExtras(['three_seven']);
  assert.deepEqual(
    series.map((set) => [set.type, set.reps, set.restSeconds]),
    [
      ['three_seven', 3, 15],
      ['three_seven', 4, 15],
      ['three_seven', 5, 15],
      ['three_seven', 6, 15],
      ['three_seven', 7, 150],
    ]
  );

  assert.equal(setsOfExtras(['drop', 'drop', 'three_seven']).length, 7);
});

const exercise = { e: { x: '0043' }, s: 3, r: null, d: 90, g: null, o: null };
const routine = (entry: object): SharedRoutine =>
  ({ v: 1, n: 'Pecho', o: null, e: [entry] }) as unknown as SharedRoutine;

test('a link from before extras existed still opens, with none', () => {
  const parsed = parseSharedRoutine(routineLink(routine(exercise)));

  assert.deepEqual(parsed?.e[0].x, []);
});

test('extras survive the link, and an unknown or oversized list is refused', () => {
  const ok = parseSharedRoutine(routineLink(routine({ ...exercise, x: ['d', 't'] })));
  assert.deepEqual(ok?.e[0].x, ['d', 't']);

  assert.equal(parseSharedRoutine(routineLink(routine({ ...exercise, x: ['w'] }))), null);
  assert.equal(parseSharedRoutine(routineLink(routine({ ...exercise, x: [1] }))), null);
  assert.equal(parseSharedRoutine(routineLink(routine({ ...exercise, x: Array(11).fill('d') }))), null);
});
