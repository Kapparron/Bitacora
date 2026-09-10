import type { Config } from 'drizzle-kit';

/**
 * Migrations are generated on the dev machine and shipped inside the bundle;
 * expo-sqlite runs them on the device at startup. There is no remote database,
 * so `drizzle-kit push` and `studio` are not used here — only `generate`.
 */
export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'expo',
} satisfies Config;
