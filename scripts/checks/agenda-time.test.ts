import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseTime } from '@/features/agenda/time';

test('the event form reads a time in the usual spellings', () => {
  assert.equal(parseTime('17:30'), '17:30');
  assert.equal(parseTime(' 9 '), '09:00');
  assert.equal(parseTime('20h'), '20:00');
  assert.equal(parseTime('8.05'), '08:05');
});

test('what is not a time of day is refused', () => {
  assert.equal(parseTime('24:00'), null);
  assert.equal(parseTime('17:60'), null);
  assert.equal(parseTime('tarde'), null);
  assert.equal(parseTime(''), null);
});
