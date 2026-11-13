import assert from 'node:assert/strict';
import { test } from 'node:test';

import { normalizeNote } from '@/features/workout/note';

test('an exercise note is trimmed, and a blank one is not stored', () => {
  assert.equal(normalizeNote('  agarre estrecho \n'), 'agarre estrecho');
  assert.equal(normalizeNote('asiento en el nivel 4'), 'asiento en el nivel 4');
  assert.equal(normalizeNote(''), null);
  assert.equal(normalizeNote('  \n '), null);
});
