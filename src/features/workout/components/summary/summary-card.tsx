import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

/**
 * The square every summary card is drawn in. Square so any of them can be
 * shared as a picture and fit a story without being cropped, and signed with
 * the app's name so the picture still says where it came from.
 */
export function SummaryCard({ size, children }: { size: number; children: ReactNode }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        { width: size, height: size, backgroundColor: theme.backgroundElement },
      ]}>
      <View style={styles.body}>{children}</View>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.brand}>
        BITÁCORA
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 20 },
  body: { flex: 1 },
  brand: { letterSpacing: 1.5 },
});
