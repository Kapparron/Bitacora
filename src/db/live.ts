import { addDatabaseChangeListener } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Re-runs a read whenever any of the given tables changes.
 *
 * Drizzle's own `useLiveQuery` only listens to the primary table of the query,
 * so a join over workouts + workout_exercises + sets never refreshes when a set
 * or an exercise is inserted. This hook takes the watched tables explicitly.
 *
 * Writes arrive one row at a time (a transaction emits an event per row), so
 * notifications are coalesced into a single refetch on the next tick.
 */
export function useLiveTables<T>(
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
      pending.current = setTimeout(refetch, 0);
    });

    return () => {
      cancelled = true;
      if (pending.current) clearTimeout(pending.current);
      listener.remove();
    };
  }, [query, watched]);

  return { data, error, loading };
}
