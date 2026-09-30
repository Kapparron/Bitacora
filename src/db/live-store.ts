import { addDatabaseChangeListener } from '@/db/client';

/**
 * The reads `useLiveTables` hands out, one per query, however many screens
 * mount it. Before this, each mount kept its own copy: the active session was
 * read four times on every set written, once for the Home screen, the session
 * bar, the session screen and its notification.
 *
 * A query is known by the hook that asks for it plus its arguments. The first
 * subscriber starts it and listens to its tables; when the last one leaves it
 * stops listening, and is forgotten a while later unless someone comes back,
 * which is what going back to a screen does. Every subscriber gets the same
 * snapshot object until the result changes, so a `useMemo` below it holds.
 *
 * Kept apart from React so the checks can drive it (scripts/checks/live.test.ts).
 */

export type LiveSnapshot<T> = {
  data: T | undefined;
  error: Error | null;
  /** True until the first result or error arrives. */
  loading: boolean;
};

/** Arguments that tell one query from another. Plain values, so they make a key. */
export type LiveArgs = readonly (string | number | boolean | null)[];

type Entry = {
  name: string;
  tables: ReadonlySet<string>;
  run: () => Promise<unknown>;
  snapshot: LiveSnapshot<unknown>;
  subscribers: Set<() => void>;
  /** Bumped on every run, so a slow answer never overwrites a newer one. */
  generation: number;
  pending: ReturnType<typeof setTimeout> | null;
  stopListening: (() => void) | null;
  forget: ReturnType<typeof setTimeout> | null;
};

const LOADING: LiveSnapshot<never> = { data: undefined, error: null, loading: true };

/** How long a query nobody watches keeps its last result. */
const FORGET_MS = 60_000;

const entries = new Map<string, Entry>();

/** Told about every re-run a write causes; the development counter listens here. */
let onReload: ((name: string) => void) | null = null;

export function setReloadListener(listener: ((name: string) => void) | null): void {
  onReload = listener;
}

export function liveKey(name: string, args: LiveArgs): string {
  return `${name}:${JSON.stringify(args)}`;
}

/**
 * The entry for a query, created on first use. `run` is refreshed on every call
 * so the entry always runs the newest closure; closures with the same key read
 * the same thing.
 */
export function liveEntry(
  key: string,
  name: string,
  tables: readonly string[],
  run: () => Promise<unknown>
): { key: string } {
  const existing = entries.get(key);
  if (existing) {
    existing.run = run;
    return { key };
  }

  entries.set(key, {
    name,
    tables: new Set(tables),
    run,
    snapshot: LOADING,
    subscribers: new Set(),
    generation: 0,
    pending: null,
    stopListening: null,
    forget: null,
  });
  return { key };
}

export function liveSnapshot<T>(key: string): LiveSnapshot<T> {
  return (entries.get(key)?.snapshot ?? LOADING) as LiveSnapshot<T>;
}

export function subscribeLive(key: string, onChange: () => void): () => void {
  const entry = entries.get(key);
  if (!entry) throw new Error(`Consulta sin registrar: ${key}`);

  entry.subscribers.add(onChange);

  if (entry.forget) {
    clearTimeout(entry.forget);
    entry.forget = null;
  }

  if (entry.subscribers.size === 1) {
    const listener = addDatabaseChangeListener(({ tableName }) => {
      if (!entry.tables.has(tableName)) return;

      // A transaction emits one event per row: coalesce them into one run.
      if (entry.pending) clearTimeout(entry.pending);
      entry.pending = setTimeout(() => {
        entry.pending = null;
        onReload?.(entry.name);
        refresh(entry);
      }, 0);
    });

    entry.stopListening = () => listener.remove();
    refresh(entry);
  }

  return () => {
    entry.subscribers.delete(onChange);
    if (entry.subscribers.size > 0) return;

    if (entry.pending) clearTimeout(entry.pending);
    entry.pending = null;
    entry.stopListening?.();
    entry.stopListening = null;
    // A result that is no longer kept up to date must not be taken as current.
    entry.generation++;
    entry.forget = setTimeout(() => entries.delete(key), FORGET_MS);
  };
}

function refresh(entry: Entry) {
  const generation = ++entry.generation;

  entry.run().then(
    (data) => settle(entry, generation, { data, error: null, loading: false }),
    (cause: unknown) =>
      settle(entry, generation, {
        data: entry.snapshot.data,
        error: cause instanceof Error ? cause : new Error(String(cause)),
        loading: false,
      })
  );
}

function settle(entry: Entry, generation: number, snapshot: LiveSnapshot<unknown>) {
  // Overtaken by a newer run, or nobody is listening any more.
  if (generation !== entry.generation) return;

  entry.snapshot = snapshot;
  for (const notify of entry.subscribers) notify();
}
