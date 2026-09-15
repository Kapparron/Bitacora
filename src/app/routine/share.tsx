import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, Share, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { QrCode } from '@/features/routines/components/qr-code';
import { useRoutineContents } from '@/features/routines/queries';
import { routineLink, toSharedRoutine } from '@/features/routines/share';
import { useTheme } from '@/hooks/use-theme';

/** Shows a routine as a QR code for a friend to scan, or sends it as a link. */
export default function ShareRoutineScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { contents, loading } = useRoutineContents(id);

  const link = useMemo(() => (contents ? routineLink(toSharedRoutine(contents)) : null), [contents]);

  if (!contents || !link) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ThemedText type="default" themeColor="textSecondary">
          {loading ? 'Cargando...' : 'Esta rutina ya no existe.'}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Compartir rutina" subtitle={contents.routine.name} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.qr}>
          <QrCode value={link} size={Math.min(width - 48, 360)} />
        </View>

        <ThemedText type="default" themeColor="textSecondary" style={styles.text}>
          Tu amigo lo escanea desde Rutinas, con Importar rutina, y se guarda en su movil con los
          mismos ejercicios, series y descansos. Cuando toca no se comparte.
        </ThemedText>

        <Button
          title="Enviar como enlace"
          variant="secondary"
          onPress={() =>
            void Share.share({ message: `Rutina "${contents.routine.name}" para Bitacora:\n${link}` })
          }
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  screen: { flex: 1 },
  content: { padding: 24, gap: 16 },
  qr: { alignItems: 'center' },
  text: { textAlign: 'center' },
});
