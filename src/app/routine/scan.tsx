import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { parseSharedRoutine } from '@/features/routines/share';
import { useTheme } from '@/hooks/use-theme';

/** Reads a routine QR code and hands it to the import screen. */
export default function ScanRoutineScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [invalid, setInvalid] = useState(false);

  // The camera fires repeatedly while a code is in view; only act on it once.
  const handled = useRef<string | null>(null);

  function onScanned(data: string) {
    if (handled.current === data) return;
    handled.current = data;

    if (!parseSharedRoutine(data)) {
      setInvalid(true);
      return;
    }

    router.replace({ pathname: '/routine/import', params: { r: data } });
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Importar rutina" />

      {!permission ? (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : !permission.granted ? (
        <View style={styles.centered}>
          <ThemedText type="default" themeColor="textSecondary" style={styles.text}>
            Bitacora necesita la camara para leer el codigo QR de la rutina.
          </ThemedText>
          <Button title="Dar permiso" onPress={() => void requestPermission()} />
        </View>
      ) : (
        <View style={styles.cameraBlock}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => onScanned(data)}
          />

          <View style={styles.hint}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
              {invalid
                ? 'Ese codigo no es una rutina de Bitacora. Prueba con otro.'
                : 'Apunta al codigo QR que muestra tu amigo en Compartir rutina.'}
            </ThemedText>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  text: { textAlign: 'center' },
  cameraBlock: { flex: 1 },
  camera: { flex: 1 },
  hint: { padding: 20 },
});
