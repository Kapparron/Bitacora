import assert from 'node:assert/strict';
import { test } from 'node:test';

import { exerciseMediaUrl } from '@/features/exercises/media';

test('a dataset path is read from the CDN and a whole address is left alone', () => {
  assert.match(exerciseMediaUrl('videos/0001-x.gif') ?? '', /^https:\/\/.+\/videos\/0001-x\.gif$/);
  assert.equal(
    exerciseMediaUrl('https://kapparron.github.io/Bitacora/media/9001.gif'),
    'https://kapparron.github.io/Bitacora/media/9001.gif'
  );
  assert.equal(exerciseMediaUrl(null), null);
});
