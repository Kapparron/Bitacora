import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

/**
 * In-app header used instead of the navigator's own bar, which is hidden across
 * the app. Being a plain view it inherits the screen background and spacing,
 * with no divider or platform chrome of its own.
 */
export function ScreenHeader({
  title,
  subtitle,
  back = true,
  right,
}: {
  title: string;
  subtitle?: string;
  /** Hidden on screens that are not pushed onto a stack. */
  back?: boolean;
  right?: ReactNode;
}) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.background }]}>
      {back ? (
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityLabel="Volver"
          style={({ pressed }) => pressed && styles.pressed}>
          <Ionicons name="chevron-back" size={26} color={theme.text} />
        </Pressable>
      ) : null}

      <View style={styles.titleBlock}>
        <ThemedText type="default" style={styles.title} numberOfLines={1}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>

      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  titleBlock: { flex: 1, gap: 1 },
  title: { fontSize: 20, fontWeight: '700' },
  pressed: { opacity: 0.5 },
});
