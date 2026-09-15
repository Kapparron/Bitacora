import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { settings } from '@/db/schema';

/**
 * Read and write for the `settings` table, which holds single values that
 * belong to the app rather than to a day or a row.
 *
 * Every value is text: the table is keyed rather than columned so that one more
 * setting does not need a migration, and the reader parses what it stored.
 */
export async function readSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key));
  return row?.value ?? null;
}

/** Writes a setting, inserting it the first time and updating it after. */
export async function writeSetting(key: string, value: string): Promise<void> {
  const [existing] = await db.select().from(settings).where(eq(settings.key, key));

  if (existing) {
    await db
      .update(settings)
      .set({ value, updatedAt: Date.now() })
      .where(eq(settings.key, key));
    return;
  }

  await db.insert(settings).values({ key, value });
}

/**
 * Removes a setting. Hard delete: an absent setting is the same as one never
 * written, and both mean "fall back to the default".
 */
export async function deleteSetting(key: string): Promise<void> {
  await db.delete(settings).where(eq(settings.key, key));
}
