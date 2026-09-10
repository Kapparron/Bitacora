import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

/**
 * Stand-in for a screen whose feature phase has not been built yet. It names the
 * phase so an unfinished tab is never mistaken for a bug.
 */
export function ScreenPlaceholder({ title, description }: { title: string; description: string }) {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.content}>
        <ThemedText type="title">{title}</ThemedText>
        <ThemedText type="default" themeColor="textSecondary" style={styles.description}>
          {description}
        </ThemedText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  description: { textAlign: 'center' },
});
