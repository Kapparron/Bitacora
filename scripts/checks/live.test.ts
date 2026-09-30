import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';

import {
  liveEntry,
  liveKey,
  liveSnapshot,
  setReloadListener,
  subscribeLive,
} from '@/db/live-store';

import { changeListenerCount, emitChange } from './database-client';

// The store behind useLiveTables, driven the way React drives it: register the
// query on render, subscribe on mount, read the snapshot when told to.

/** A query that counts its runs and answers when the check says so. */
function controlledQuery() {
  const answers: ((value: string) => void)[] = [];
  const run = () => new Promise<string>((resolve) => answers.push(resolve));
  return { run, answers, runs: () => answers.length };
}

/** Lets resolved promises deliver, without moving the mocked clock. */
async function settle() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

let keys = 0;
/** A fresh key per check, so no check sees another's entry. */
function uniqueName() {
  return `useCheck${++keys}`;
}

function mockTimers(t: TestContext) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  return t.mock.timers;
}

test('two mounts of the same query share one read and one snapshot', async (t) => {
  mockTimers(t);
  const query = controlledQuery();
  const key = liveKey(uniqueName(), ['2026-09-30']);

  liveEntry(key, 'useCheck', ['sets'], query.run);
  const first = subscribeLive(key, () => {});
  liveEntry(key, 'useCheck', ['sets'], query.run);
  const second = subscribeLive(key, () => {});

  assert.equal(query.runs(), 1);
  assert.equal(liveSnapshot(key).loading, true);

  query.answers[0]('hecho');
  await settle();

  const snapshot = liveSnapshot(key);
  assert.deepEqual(snapshot, { data: 'hecho', error: null, loading: false });
  // Same object on every read until something changes: a useMemo below holds.
  assert.equal(liveSnapshot(key), snapshot);

  first();
  second();
});

test('a burst of writes to a watched table runs the query once, for every mount', async (t) => {
  const timers = mockTimers(t);
  const query = controlledQuery();
  const name = uniqueName();
  const key = liveKey(name, []);
  const reloads: string[] = [];
  setReloadListener((reloaded) => reloads.push(reloaded));
  t.after(() => setReloadListener(null));

  let notified = 0;
  liveEntry(key, name, ['sets', 'workouts'], query.run);
  const first = subscribeLive(key, () => notified++);
  const second = subscribeLive(key, () => notified++);
  query.answers[0]('antes');
  await settle();
  notified = 0;

  // One transaction, one event per row.
  emitChange('sets');
  emitChange('sets');
  emitChange('workouts');
  timers.tick(0);

  assert.equal(query.runs(), 2);
  assert.deepEqual(reloads, [name]);

  query.answers[1]('despues');
  await settle();
  assert.equal(liveSnapshot(key).data, 'despues');
  assert.equal(notified, 2, 'each mount hears it once');

  // A table the query does not read changes nothing.
  emitChange('food_entries');
  timers.tick(0);
  assert.equal(query.runs(), 2);

  first();
  second();
});

test('a slow answer never overwrites a newer one', async (t) => {
  const timers = mockTimers(t);
  const query = controlledQuery();
  const key = liveKey(uniqueName(), []);

  liveEntry(key, 'useCheck', ['sets'], query.run);
  const stop = subscribeLive(key, () => {});
  emitChange('sets');
  timers.tick(0);
  assert.equal(query.runs(), 2);

  query.answers[1]('nuevo');
  await settle();
  query.answers[0]('viejo');
  await settle();

  assert.equal(liveSnapshot(key).data, 'nuevo');
  stop();
});

test('the last mount to leave stops listening, and coming back reads again', async (t) => {
  const timers = mockTimers(t);
  const query = controlledQuery();
  const key = liveKey(uniqueName(), []);
  const listening = changeListenerCount();

  liveEntry(key, 'useCheck', ['sets'], query.run);
  const stop = subscribeLive(key, () => {});
  assert.equal(changeListenerCount(), listening + 1);
  query.answers[0]('primera');
  await settle();

  stop();
  assert.equal(changeListenerCount(), listening);

  // Writes while nobody watches run nothing.
  emitChange('sets');
  timers.tick(0);
  assert.equal(query.runs(), 1);

  // Back to the screen: the last result shows at once, and is read again.
  liveEntry(key, 'useCheck', ['sets'], query.run);
  const again = subscribeLive(key, () => {});
  assert.equal(liveSnapshot(key).data, 'primera');
  assert.equal(query.runs(), 2);
  query.answers[1]('segunda');
  await settle();
  assert.equal(liveSnapshot(key).data, 'segunda');
  again();

  // Nobody back within the minute: forgotten.
  timers.tick(60_000);
  assert.equal(liveSnapshot(key).loading, true);
});

test('an answer that arrives after everyone left is not kept as current', async (t) => {
  mockTimers(t);
  const query = controlledQuery();
  const key = liveKey(uniqueName(), []);

  liveEntry(key, 'useCheck', ['sets'], query.run);
  const stop = subscribeLive(key, () => {});
  stop();

  query.answers[0]('tarde');
  await settle();
  assert.equal(liveSnapshot(key).loading, true);
});
