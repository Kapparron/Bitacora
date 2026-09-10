import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import migrations from '../../drizzle/migrations';
import { db } from './client';
import { seedExercises } from './seed';

type DatabaseStatus = { ready: boolean; error: Error | null };

const DatabaseStatusContext = createContext<DatabaseStatus>({ ready: false, error: null });

export function useDatabaseStatus(): DatabaseStatus {
  return use(DatabaseStatusContext);
}

/**
 * Blocks the app until migrations and the exercise seed have run. Everything
 * below this provider can assume the schema exists and the built-in catalogue is
 * present, so no screen needs its own loading branch for that.
 *
 * The connection itself lives in ./client as a module singleton; `useLiveQuery`
 * listens to expo-sqlite's global change events, so no SQLiteProvider is needed.
 */
export function DatabaseProvider({ children }: { children: ReactNode }) {
  const { success, error: migrationError } = useMigrations(db, migrations);
  const [seeded, setSeeded] = useState(false);
  const [seedError, setSeedError] = useState<Error | null>(null);

  useEffect(() => {
    if (!success || seeded) return;

    let cancelled = false;
    seedExercises()
      .then(() => {
        if (!cancelled) setSeeded(true);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setSeedError(cause instanceof Error ? cause : new Error(String(cause)));
      });

    return () => {
      cancelled = true;
    };
  }, [success, seeded]);

  const error = migrationError ?? seedError ?? null;

  if (error) {
    // A failed migration leaves the database in an unknown state, so the app must
    // not continue to screens that would write to it.
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>No se pudo abrir la base de datos</Text>
        <Text style={styles.errorBody}>{error.message}</Text>
      </View>
    );
  }

  if (!success || !seeded) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return <DatabaseStatusContext value={{ ready: true, error: null }}>{children}</DatabaseStatusContext>;
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  errorTitle: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
  errorBody: { fontSize: 14, opacity: 0.7, textAlign: 'center' },
});
