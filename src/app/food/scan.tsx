import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { cacheProduct } from '@/features/nutrition/mutations';
import { lookupBarcode } from '@/features/nutrition/openfoodfacts';
import { findFoodByBarcode, type Meal } from '@/features/nutrition/queries';
import { useTheme } from '@/hooks/use-theme';

export default function ScanScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { date, meal } = useLocalSearchParams<{ date: string; meal: Meal }>();

  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<'scanning' | 'looking-up' | 'error'>('scanning');
  const [message, setMessage] = useState<string | null>(null);

  // The camera fires this repeatedly while a barcode is in view; the ref stops
  // the same code being looked up a dozen times.
  const handled = useRef<string | null>(null);

  async function onScanned(barcode: string) {
    if (handled.current === barcode || status === 'looking-up') return;
    handled.current = barcode;
    setStatus('looking-up');
    setMessage(null);

    try {
      // A product scanned before is already in the local cache, so a repeat scan
      // works without a network at all.
      const cached = await findFoodByBarcode(barcode);
      if (cached) {
        router.replace({ pathname: '/food/amount', params: { foodId: cached.id, date, meal } });
        return;
      }

      const result = await lookupBarcode(barcode);

      if (result.status === 'found') {
        const food = await cacheProduct(result.product);
        router.replace({ pathname: '/food/amount', params: { foodId: food.id, date, meal } });
        return;
      }

      setStatus('error');
      setMessage(
        result.status === 'not_found'
          ? `El codigo ${barcode} no esta en Open Food Facts. Puedes crear el alimento a mano.`
          : 'Ese producto no tiene calorias registradas en Open Food Facts. Crealo a mano.'
      );
    } catch {
      setStatus('error');
      setMessage('No se pudo consultar Open Food Facts. Comprueba la conexion.');
    }
  }

  function retry() {
    handled.current = null;
    setMessage(null);
    setStatus('scanning');
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Escanear codigo" />

      {!permission ? (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : !permission.granted ? (
        <View style={styles.centered}>
          <ThemedText type="default" themeColor="textSecondary" style={styles.text}>
            Bitacora necesita la camara para leer el codigo de barras.
          </ThemedText>
          <Button title="Dar permiso" onPress={() => void requestPermission()} />
        </View>
      ) : status === 'error' ? (
        <View style={styles.centered}>
          <ThemedText type="default" themeColor="textSecondary" style={styles.text}>
            {message}
          </ThemedText>
          <Button title="Escanear otro" onPress={retry} />
          <Button
            title="Crear a mano"
            variant="secondary"
            onPress={() => router.replace({ pathname: '/food/form', params: { date, meal } })}
          />
        </View>
      ) : (
        <View style={styles.cameraBlock}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={({ data }) => void onScanned(data)}
          />

          <View style={styles.hint}>
            {status === 'looking-up' ? (
              <>
                <ActivityIndicator />
                <ThemedText type="small" themeColor="textSecondary">
                  Buscando el producto...
                </ThemedText>
              </>
            ) : (
              <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
                Apunta al codigo de barras del envase.
              </ThemedText>
            )}
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
  hint: { alignItems: 'center', gap: 8, padding: 20 },
});
