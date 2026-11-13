import { inArray } from 'drizzle-orm';

import { db } from '@/db/client';
import { useLiveTables } from '@/db/live';
import { settings } from '@/db/schema';
import { writeSetting } from '@/db/settings';

import {
  DEFAULT_REMINDERS,
  REMINDER_KEYS,
  parseReminderSettings,
  type ReminderSettings,
} from './plan';

/** The reminder settings, read live so the reminders are planned again on a change. */
export function useReminderSettings(): { settings: ReminderSettings; loading: boolean } {
  const { data, loading } = useLiveTables(
    'useReminderSettings',
    ['settings'],
    async () => {
      const rows = await db
        .select()
        .from(settings)
        .where(inArray(settings.key, Object.values(REMINDER_KEYS)));
      const value = (key: string) => rows.find((row) => row.key === key)?.value ?? null;

      return parseReminderSettings({
        morning: value(REMINDER_KEYS.morning),
        morningTime: value(REMINDER_KEYS.morningTime),
        events: value(REMINDER_KEYS.events),
        eventAdvance: value(REMINDER_KEYS.eventAdvance),
      });
    },
    []
  );

  return { settings: data ?? DEFAULT_REMINDERS, loading };
}

/** Stores one reminder setting, as the text parseReminderSettings reads back. */
export async function saveReminderSetting<K extends keyof ReminderSettings>(
  key: K,
  value: ReminderSettings[K]
): Promise<void> {
  const text = typeof value === 'boolean' ? (value ? 'on' : 'off') : String(value);
  await writeSetting(REMINDER_KEYS[key], text);
}
