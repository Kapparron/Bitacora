import type { DatabaseSync } from 'node:sqlite';

import { drizzle } from 'drizzle-orm/sqlite-proxy';

import * as schema from '@/db/schema';

/**
 * What the checks get when they import `@/db/client` (see register.mjs): the
 * app's schema, through Drizzle, over the in-memory database a check hands to
 * `setDatabase`. Each feature's queries.ts runs here unchanged.
 *
 * It answers reads. The app's writes run inside synchronous transactions, which
 * only the expo-sqlite driver offers, so a check sets up its rows in SQL.
 */
let current: DatabaseSync | null = null;

/** Points every query at this database until the next call. */
export function setDatabase(database: DatabaseSync): void {
  current = database;
}

export const db = drizzle(
  async (query, params, method) => {
    if (!current) throw new Error('Llama a setDatabase() antes de consultar.');

    const statement = current.prepare(query);
    // Drizzle maps columns by position, as the expo driver hands them over.
    statement.setReturnArrays(true);

    if (method === 'run') {
      statement.run(...(params as never[]));
      return { rows: [] };
    }

    if (method === 'get') return { rows: statement.get(...(params as never[])) as never };
    return { rows: statement.all(...(params as never[])) as never };
  },
  { schema }
);

export type Database = typeof db;
export { schema };

type ChangeListener = (event: { tableName: string }) => void;

const changeListeners = new Set<ChangeListener>();

/** The same contract as expo-sqlite's; a check fires it with `emitChange`. */
export function addDatabaseChangeListener(listener: ChangeListener): { remove(): void } {
  changeListeners.add(listener);
  return { remove: () => changeListeners.delete(listener) };
}

/** What expo-sqlite does after a write to one row of `tableName`. */
export function emitChange(tableName: string): void {
  for (const listener of changeListeners) listener({ tableName });
}

export function changeListenerCount(): number {
  return changeListeners.size;
}
