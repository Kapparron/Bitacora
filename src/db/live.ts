import { useCallback, useRef, useSyncExternalStore } from 'react';

import { addDatabaseChangeListener } from '@/db/client';

import {
  liveEntry,
  liveKey,
  liveSnapshot,
  setReloadListener,
  subscribeLive,
  type LiveArgs,
  type LiveSnapshot,
} from './live-store';

/**
 * Development only: which reads each burst of writes sets off. Once the writes
 * have been quiet for a moment, one line goes to the console with the tables
 * written and how many times each hook re-ran, so a change to how the app reads
 * can be judged by a number rather than a feeling:
 *
 *   [lecturas] sets -> 6: useActiveWorkout x2, useWorkoutContents x1, ...
 *
 * Off in release builds, and in the checks, where `__DEV__` does not exist.
 */
const COUNTING = typeof __DEV__ !== 'undefined' && __DEV__;
const QUIET_MS = 300;

const written = new Set<string>();
const reloads = new Map<string, number>();
let report: ReturnType<typeof setTimeout> | null = null;

function scheduleReport() {
  if (report) clearTimeout(report);
  report = setTimeout(() => {
    report = null;
    if (reloads.size === 0) {
      written.clear();
      return;
    }

    const total = [...reloads.values()].reduce((sum, count) => sum + count, 0);
    const byHook = [...reloads.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `${name} x${count}`)
      .join(', ');

    console.log(`[lecturas] ${[...written].join(', ')} -> ${total}: ${byHook}`);
    written.clear();
    reloads.clear();
  }, QUIET_MS);
}

function countReload(name: string) {
  reloads.set(name, (reloads.get(name) ?? 0) + 1);
  scheduleReport();
}

if (COUNTING) {
  setReloadListener(countReload);
  addDatabaseChangeListener(({ tableName }) => {
    written.add(tableName);
    scheduleReport();
  });
}

/**
 * Re-runs a read whenever any of the given tables changes. The one way the app
 * reads its database: TanStack Query is only for the network.
 *
 * Drizzle's own `useLiveQuery` only listens to the primary table of the query,
 * so a join over workouts + workout_exercises + sets never refreshes when a set
 * or an exercise is inserted. This hook takes the watched tables explicitly.
 *
 * `name` is the hook that wraps this one, and what the development counter above
 * reports. With `args`, whatever else the query depends on, it tells one query
 * from another: every mount of the same query shares one read and one result
 * (see ./live-store).
 *
 * `tables` are the ones the query reads, and only those: a write to any of them
 * runs it again, however many rows the write touched.
 */
export function useLiveTables<T>(
  name: string,
  tables: readonly string[],
  run: () => Promise<T>,
  args: LiveArgs
): LiveSnapshot<T> {
  const key = liveKey(name, args);
  liveEntry(key, name, tables, run);

  const subscribe = useCallback((onChange: () => void) => subscribeLive(key, onChange), [key]);
  const getSnapshot = useCallback(() => liveSnapshot<T>(key), [key]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);

  // While a new query (another day, another exercise) is on its way, keep
  // showing the last one instead of flashing an empty screen.
  const shown = useRef(snapshot);
  if (!snapshot.loading) shown.current = snapshot;

  return snapshot.loading && !shown.current.loading ? shown.current : snapshot;
}
