import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { Release } from '@/features/updates/updates';

/** Bytes as megabytes, which is the only unit an APK is ever read in. */
function megabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
}

/**
 * Offers a newer version. Modal rather than a banner: the download is a minute
 * of network and ends in the system installer, so it deserves a decision.
 *
 * Closing it with the back gesture counts as "ahora no", the same as the button.
 */
export function UpdatePrompt({
  release,
  progress,
  busy,
  onInstall,
  onDismiss,
}: {
  release: Release | null;
  progress: number | null;
  busy: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}) {
  const theme = useTheme();

  return (
    <Modal
      visible={release !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={busy ? () => {} : onDismiss}>
      <View style={styles.backdrop}>
        <View
          style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <ThemedText type="small" themeColor="textSecondary">
            NUEVA VERSION
          </ThemedText>

          <ThemedText type="subtitle">{release?.name}</ThemedText>

          {release?.size ? (
            <ThemedText type="small" themeColor="textSecondary">
              Descarga de {megabytes(release.size)}
            </ThemedText>
          ) : null}

          {release?.notes ? (
            <ScrollView style={styles.notes}>
              <ThemedText type="small" themeColor="textSecondary">
                {release.notes}
              </ThemedText>
            </ScrollView>
          ) : null}

          {busy ? (
            <View style={styles.progress}>
              <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
                <View
                  style={[
                    styles.fill,
                    { backgroundColor: theme.accent, width: `${Math.round((progress ?? 0) * 100)}%` },
                  ]}
                />
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                Descargando {Math.round((progress ?? 0) * 100)}%
              </ThemedText>
            </View>
          ) : (
            <>
              <Button title="Instalar" onPress={onInstall} />
              <Button title="Ahora no" variant="secondary" onPress={onDismiss} />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 10,
  },
  notes: { maxHeight: 160 },
  progress: { gap: 6, paddingTop: 4 },
  track: { height: 8, borderRadius: 999, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 999 },
});
