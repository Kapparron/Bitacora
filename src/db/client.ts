import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';

import * as schema from './schema';

export const DATABASE_NAME = 'bitacora.db';

/**
 * `enableChangeListener` is what makes `useLiveQuery` re-render on writes, so it
 * must stay on. Foreign keys are off by default in SQLite and the schema relies
 * on `on delete cascade`, hence the pragma.
 */
export const sqliteDb = SQLite.openDatabaseSync(DATABASE_NAME, {
  enableChangeListener: true,
});

sqliteDb.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(sqliteDb, { schema });

export type Database = typeof db;
export { schema };

/**
 * Change events come from the same connection, so they are handed out here with
 * it. This module is the only one that opens expo-sqlite: the checks swap it
 * for one over node:sqlite (scripts/checks/database-client.ts) and run the
 * app's own queries against it.
 */
export { addDatabaseChangeListener } from 'expo-sqlite';
