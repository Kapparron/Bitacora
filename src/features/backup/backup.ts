import { eq } from 'drizzle-orm';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { db } from '@/db/client';
import {
  bodyMetrics,
  exercises,
  foodEntries,
  foods,
  nutritionGoals,
  personalRecords,
  restDays,
  routineExercises,
  routines,
  sets,
  settings,
  workoutExercises,
  workouts,
} from '@/db/schema';
import { toIsoDay } from '@/lib/format';

/**
 * Bumped when a backup written by an older version can no longer be restored as
 * it stands. Restoring refuses anything it does not know how to read, rather
 * than half-loading it.
 */
export const BACKUP_VERSION = 1;

/**
 * Tables in dependency order: a row only references tables above it. Exporting
 * follows this order and restoring inserts in it, so foreign keys hold at every
 * step; deleting walks it backwards.
 */
const TABLES = [
  ['exercises', exercises],
  ['routines', routines],
  ['routineExercises', routineExercises],
  ['workouts', workouts],
  ['workoutExercises', workoutExercises],
  ['sets', sets],
  ['personalRecords', personalRecords],
  ['foods', foods],
  ['foodEntries', foodEntries],
  ['nutritionGoals', nutritionGoals],
  ['bodyMetrics', bodyMetrics],
  ['restDays', restDays],
  ['settings', settings],
] as const;

type TableName = (typeof TABLES)[number][0];

export type Backup = {
  version: number;
  exportedAt: number;
  /**
   * Every row of every table, keyed by the names above. A table added after a
   * backup was written is absent from it, so reading one is optional.
   */
  tables: Partial<Record<TableName, Record<string, unknown>[]>>;
};

/** How many rows go into one insert. SQLite caps the variables per statement. */
const CHUNK = 50;

export async function buildBackup(): Promise<Backup> {
  const tables = {} as Backup['tables'];

  for (const [name, table] of TABLES) {
    tables[name] = (await db.select().from(table)) as Record<string, unknown>[];
  }

  return { version: BACKUP_VERSION, exportedAt: Date.now(), tables };
}

export type ExportResult = { fileName: string; rows: number; shared: boolean };

/**
 * Writes the whole database as JSON and hands it to the system share sheet,
 * which is the only way out of the app's sandbox that needs no permissions.
 * The file stays in the cache directory, so the system reclaims it later.
 */
export async function exportBackup(): Promise<ExportResult> {
  const backup = await buildBackup();
  const rows = Object.values(backup.tables).reduce((sum, table) => sum + table.length, 0);

  const fileName = `bitacora-${toIsoDay()}.json`;
  const file = new File(Paths.cache, fileName);

  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(backup));

  const shared = await Sharing.isAvailableAsync();
  if (shared) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Guardar copia de Bitacora',
    });
  }

  return { fileName, rows, shared };
}

/** Thrown for a file that is not a backup this version can restore. */
export class BackupFormatError extends Error {}

function parseBackup(contents: string): Backup {
  let parsed: unknown;

  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new BackupFormatError('El archivo no es un JSON valido.');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new BackupFormatError('El archivo no es una copia de Bitacora.');
  }

  const backup = parsed as Partial<Backup>;

  if (backup.version !== BACKUP_VERSION) {
    throw new BackupFormatError(
      `La copia es de la version ${String(backup.version)} y esta app lee la ${BACKUP_VERSION}.`
    );
  }

  if (typeof backup.tables !== 'object' || backup.tables === null) {
    throw new BackupFormatError('La copia no trae datos.');
  }

  for (const [name] of TABLES) {
    const table = backup.tables[name];
    // A table this build knows and the backup does not is read as empty: a
    // backup written before that table existed is still a valid backup.
    if (table !== undefined && !Array.isArray(table)) {
      throw new BackupFormatError(`La tabla ${name} de la copia no se entiende.`);
    }
  }

  return backup as Backup;
}

/**
 * Opens the system file picker and reads the chosen backup. Returns null when
 * the user cancels; throws `BackupFormatError` when the file is not one.
 */
export async function pickBackup(): Promise<Backup | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json'] });
  if (picked.canceled) return null;

  return parseBackup(await picked.result.text());
}

export type RestoreResult = { rows: number };

/**
 * Replaces everything in the database with the backup's contents.
 *
 * This is destructive by design: a backup is a snapshot, and merging it with
 * whatever is on the device would silently produce a state that never existed.
 * It runs in one transaction, so a failure half way leaves the current data in
 * place.
 */
export async function restoreBackup(backup: Backup): Promise<RestoreResult> {
  let rows = 0;

  db.transaction((tx) => {
    for (const [, table] of [...TABLES].reverse()) {
      tx.delete(table).run();
    }

    for (const [name, table] of TABLES) {
      const contents = backup.tables[name] ?? [];

      for (let index = 0; index < contents.length; index += CHUNK) {
        const chunk = contents.slice(index, index + CHUNK);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tx.insert(table).values(chunk as any).run();
        rows += chunk.length;
      }
    }
  });

  return { rows };
}

export type WipeResult = { rows: number };

/**
 * Deletes everything the user has recorded, leaving the app as it was on first
 * launch.
 *
 * The catalogue exercises stay: they are seeded data, not something the user
 * entered, and the seed only refills them at launch. Exercises the user created
 * go with the rest.
 *
 * One transaction, so an interrupted wipe leaves the data untouched rather than
 * half gone.
 */
export async function wipeData(): Promise<WipeResult> {
  let rows = 0;

  db.transaction((tx) => {
    for (const [name, table] of [...TABLES].reverse()) {
      if (name === 'exercises') continue;

      rows += tx.delete(table).run().changes;
    }

    // Last, so the sessions and routines that referenced them are already gone.
    rows += tx.delete(exercises).where(eq(exercises.isCustom, true)).run().changes;
  });

  return { rows };
}
