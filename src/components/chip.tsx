import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

/** A pill to pick one option among a few: filled with the accent when chosen. */
export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: active ? theme.accent : theme.backgroundElement },
        pressed && { opacity: 0.6 },
      ]}>
      <ThemedText
        type="small"
        style={{ color: active ? theme.onAccent : theme.text, fontWeight: '600' }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
});
