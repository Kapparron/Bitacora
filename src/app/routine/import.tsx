import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { importRoutine } from '@/features/routines/mutations';
import { useCatalogueNames } from '@/features/routines/queries';
import { parseSharedRoutine, type SharedEntry } from '@/features/routines/share';
import { useTheme } from '@/hooks/use-theme';
import { formatRest } from '@/lib/format';

/** What the routine editor shows when a routine leaves the sets unset. */
const DEFAULT_SETS = 3;

/**
 * Where a shared routine lands, from the in-app scanner or from a
 * `bitacora://routine/import?r=...` link opened outside the app. It shows what
 * would be saved and asks first: nothing is written until the user confirms.
 */
export default function ImportRoutineScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { r } = useLocalSearchParams<{ r?: string }>();
  const shared = useMemo(() => (r ? parseSharedRoutine(r) : null), [r]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'missing' | 'failed'>('idle');

  const externalIds = useMemo(
    () => [...new Set(shared?.e.flatMap((entry) => ('x' in entry.e ? [entry.e.x] : [])) ?? [])],
    [shared]
  );
  const names = useCatalogueNames(externalIds);
  // Known before saving, so the question is not asked for a routine that cannot be kept.
  const missing = names !== null && externalIds.some((id) => !names.has(id));

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

  function cancel() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  if (!shared) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Importar rutina" />

        <View style={styles.invalid}>
          <ThemedText type="default" themeColor="textSecondary" style={styles.centered}>
            Este enlace no contiene una rutina valida. Puede venir de una version mas nueva de
            Bitacora o haberse cortado al copiarlo.
          </ThemedText>
          <Button
            title="Escanear un codigo"
            variant="secondary"
            onPress={() => router.replace('/routine/scan')}
          />
        </View>
      </View>
    );
  }

  const count = shared.e.length;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Importar rutina" />

      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">¿Quieres importar la rutina «{shared.n}»?</ThemedText>
        <ThemedText type="default" themeColor="textSecondary">
          {count === 1 ? '1 ejercicio' : `${count} ejercicios`}. Se guarda como una rutina nueva;
          puedes cambiarla despues sin tocar la de quien te la paso.
        </ThemedText>

        {shared.o ? (
          <ThemedText type="default" themeColor="textSecondary" style={styles.notes}>
            {shared.o}
          </ThemedText>
        ) : null}

        <View style={styles.list}>
          {shared.e.map((entry, index) => (
            <EntryRow key={index} entry={entry} names={names} />
          ))}
        </View>
      </ScrollView>

      <View
        style={[styles.footer, { borderColor: theme.border, paddingBottom: insets.bottom + 16 }]}>
        {missing || status === 'missing' ? (
          <ThemedText type="default" style={{ color: theme.danger }}>
            Esta rutina usa ejercicios que tu version de Bitacora aun no tiene. Actualiza la app y
            vuelve a abrir el enlace.
          </ThemedText>
        ) : null}

        {status === 'failed' ? (
          <ThemedText type="default" style={{ color: theme.danger }}>
            No se pudo guardar la rutina.
          </ThemedText>
        ) : null}

        <Button
          title={status === 'saving' ? 'Guardando...' : 'Guardar rutina'}
          disabled={status === 'saving' || missing || status === 'missing'}
          onPress={() => void save()}
        />
        <Button title="Cancelar" variant="secondary" onPress={cancel} />
      </View>
    </View>
  );
}

/** One exercise of the routine as it would be saved: who it is and its targets. */
function EntryRow({ entry, names }: { entry: SharedEntry; names: Map<string, string> | null }) {
  const theme = useTheme();

  const known = 'x' in entry.e ? names?.get(entry.e.x) : entry.e.n;
  const name = known ?? (names === null ? '...' : 'Ejercicio que tu version no tiene');
  const sets = entry.s ?? DEFAULT_SETS;
  const target = entry.r?.trim() ? `${sets} × ${entry.r.trim()}` : `${sets} series`;

  return (
    <View
      style={[
        styles.row,
        { borderColor: theme.border },
        entry.g !== null && { borderLeftWidth: 3, borderLeftColor: theme.accent },
      ]}>
      {entry.g !== null ? (
        <ThemedText type="smallBold" style={{ color: theme.accentText }}>
          SUPERSERIE {String.fromCharCode(64 + entry.g)}
        </ThemedText>
      ) : null}
      <ThemedText
        type="default"
        style={[styles.name, known === undefined && names !== null && { color: theme.danger }]}>
        {name}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {target} · Descanso: {formatRest(entry.d)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  invalid: { flex: 1, justifyContent: 'center', gap: 16, padding: 24 },
  centered: { textAlign: 'center' },
  content: { padding: 16, gap: 8 },
  notes: { fontStyle: 'italic' },
  list: { gap: 8, marginTop: 8 },
  row: {
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  name: { fontWeight: '700' },
  footer: { padding: 16, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
});
