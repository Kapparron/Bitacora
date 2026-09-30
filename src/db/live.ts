import { useCallback, useEffect, useRef, useState } from 'react';

import { addDatabaseChangeListener } from '@/db/client';

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
 * Writes arrive one row at a time (a transaction emits an event per row), so
 * notifications are coalesced into a single refetch on the next tick.
 *
 * `name` is the hook that wraps this one, and is what the development counter
 * above reports.
 */
export function useLiveTables<T>(
  name: string,
  tables: readonly string[],
  run: () => Promise<T>,
  deps: readonly unknown[]
): { data: T | undefined; error: Error | null; loading: boolean } {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const query = useCallback(run, deps);
  const watched = tables.join(',');
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    function refetch() {
      query()
        .then((result) => {
          if (cancelled) return;
          setData(result);
          setError(null);
          setLoading(false);
        })
        .catch((cause: unknown) => {
          if (cancelled) return;
          setError(cause instanceof Error ? cause : new Error(String(cause)));
          setLoading(false);
        });
    }

    refetch();

    const names = new Set(watched.split(','));
    const listener = addDatabaseChangeListener(({ tableName }) => {
      if (!names.has(tableName)) return;
      if (pending.current) clearTimeout(pending.current);
      pending.current = setTimeout(() => {
        if (COUNTING) countReload(name);
        refetch();
      }, 0);
    });

    return () => {
      cancelled = true;
      if (pending.current) clearTimeout(pending.current);
      listener.remove();
    };
  }, [name, query, watched]);

  return { data, error, loading };
}
