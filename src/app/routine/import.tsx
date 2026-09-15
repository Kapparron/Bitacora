import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { importRoutine } from '@/features/routines/mutations';
import { parseSharedRoutine } from '@/features/routines/share';
import { useTheme } from '@/hooks/use-theme';

/**
 * Where a shared routine lands, from the in-app scanner or from a
 * `bitacora://routine/import?r=...` link opened outside the app. Nothing is
 * saved until the user confirms.
 */
export default function ImportRoutineScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { r } = useLocalSearchParams<{ r?: string }>();
  const shared = useMemo(() => (r ? parseSharedRoutine(r) : null), [r]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'missing' | 'failed'>('idle');

  async function save() {
    if (!shared) return;
    setStatus('saving');

    try {
      const result = await importRoutine(shared);
      if (result.status === 'missing_exercises') {
        setStatus('missing');
        return;
      }
      router.replace(`/routine/${result.routineId}`);
    } catch {
      setStatus('failed');
    }
  }

  const count = shared?.e.length ?? 0;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Importar rutina" />

      <View style={styles.content}>
        {shared ? (
          <>
            <ThemedText type="subtitle" style={styles.text}>
              {shared.n}
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary" style={styles.text}>
              {count === 1 ? '1 ejercicio' : `${count} ejercicios`}. Se guarda como una rutina
              nueva; puedes cambiarla despues sin tocar la de quien te la paso.
            </ThemedText>

            {status === 'missing' ? (
              <ThemedText type="default" style={[styles.text, { color: theme.danger }]}>
                Esta rutina usa ejercicios que tu version de Bitacora aun no tiene. Actualiza la
                app y vuelve a escanearla.
              </ThemedText>
            ) : null}

            {status === 'failed' ? (
              <ThemedText type="default" style={[styles.text, { color: theme.danger }]}>
                No se pudo guardar la rutina.
              </ThemedText>
            ) : null}

            <Button
              title={status === 'saving' ? 'Guardando...' : 'Guardar rutina'}
              disabled={status === 'saving' || status === 'missing'}
              onPress={() => void save()}
            />
          </>
        ) : (
          <>
            <ThemedText type="default" themeColor="textSecondary" style={styles.text}>
              Este enlace no contiene una rutina valida. Puede venir de una version mas nueva de
              Bitacora o haberse cortado al copiarlo.
            </ThemedText>
            <Button
              title="Escanear un codigo"
              variant="secondary"
              onPress={() => router.replace('/routine/scan')}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', gap: 16, padding: 24 },
  text: { textAlign: 'center' },
});
