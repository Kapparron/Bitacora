import assert from 'node:assert/strict';
import { test } from 'node:test';

import { moveItem, reorderBlocks } from '@/lib/reorder';

const item = (id: string, supersetGroup: number | null) => ({ id, supersetGroup });

test('a superset moves as one block and loose exercises on their own', () => {
  const blocks = reorderBlocks([
    item('a', null),
    item('b', 1),
    item('c', 1),
    item('d', null),
    item('e', 2),
    item('f', 2),
    item('g', 2),
  ]);

  assert.deepEqual(
    blocks.map((block) => block.map((entry) => entry.id)),
    [['a'], ['b', 'c'], ['d'], ['e', 'f', 'g']]
  );
});

test('two adjacent supersets stay apart', () => {
  const blocks = reorderBlocks([item('a', 1), item('b', 1), item('c', 2), item('d', 2)]);

  assert.equal(blocks.length, 2);
});

test('moving the last exercise to the top keeps the rest in order', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c', 'd'], 3, 0), ['d', 'a', 'b', 'c']);
  assert.deepEqual(moveItem(['a', 'b', 'c', 'd'], 0, 2), ['b', 'c', 'a', 'd']);
  assert.deepEqual(moveItem(['a', 'b', 'c'], 1, 1), ['a', 'b', 'c']);
});
