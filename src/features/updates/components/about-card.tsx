import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { installedVersion, useUpdates } from '@/features/updates/components/update-provider';
import { useTheme } from '@/hooks/use-theme';

/**
 * Which version is installed, and a way to ask for a newer one without waiting
 * for the daily check. Kept apart from the backup card: that one is about the
 * data, this one about the app.
 */
export function AboutCard() {
  const theme = useTheme();
  const { status, available, note, check } = useUpdates();

  return (
    <View style={[styles.card, { borderColor: theme.border }]}>
      <ThemedText type="small" themeColor="textSecondary">
        ACERCA DE
      </ThemedText>

      <ThemedText type="default">Bitacora {installedVersion ?? 'version desconocida'}</ThemedText>

      <Button
        title={status === 'checking' ? 'Buscando...' : 'Buscar actualizaciones'}
        variant="secondary"
        disabled={status !== 'idle'}
        onPress={() => void check()}
      />

      {available ? (
        <ThemedText type="small" themeColor="textSecondary">
          Disponible la version {available.version}.
        </ThemedText>
      ) : null}

      {note ? (
        <ThemedText type="small" themeColor="textSecondary">
          {note}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: 8 },
});
