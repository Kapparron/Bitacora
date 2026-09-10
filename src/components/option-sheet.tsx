import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export type SheetOption<T> = {
  value: T;
  label: string;
  description?: string;
  /** Short marker drawn in a square to the left, such as a set-type letter. */
  badge?: string;
};

/**
 * Bottom sheet that picks one value from a short list.
 *
 * Render it only while it is open. A Modal is a native window even when
 * invisible, and these sheets live inside list rows, where a session can hold
 * dozens of them at once.
 */
export function OptionSheet<T extends string | number | null>({
  title,
  options,
  current,
  onSelect,
  onClose,
}: {
  title: string;
  options: readonly SheetOption<T>[];
  current: T;
  onSelect: (value: T) => void;
  onClose: () => void;
}) {
  const theme = useTheme();

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Swallows taps on the sheet so they do not reach the backdrop. */}
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.border }]}
          onPress={() => {}}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.heading}>
            {title.toUpperCase()}
          </ThemedText>

          <ScrollView bounces={false}>
            {options.map((option) => (
              <Pressable
                key={String(option.value)}
                onPress={() => onSelect(option.value)}
                style={({ pressed }) => [
                  styles.option,
                  pressed && { backgroundColor: theme.backgroundElement },
                ]}>
                {option.badge ? (
                  <View style={[styles.badge, { backgroundColor: theme.backgroundElement }]}>
                    <ThemedText type="smallBold" style={{ color: theme.accentText }}>
                      {option.badge}
                    </ThemedText>
                  </View>
                ) : null}

                <View style={styles.optionText}>
                  <ThemedText type="default">{option.label}</ThemedText>
                  {option.description ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {option.description}
                    </ThemedText>
                  ) : null}
                </View>

                {option.value === current ? (
                  <Ionicons name="checkmark" size={20} color={theme.accentText} />
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
    paddingBottom: 32,
  },
  heading: { paddingHorizontal: 20, paddingBottom: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  badge: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, gap: 2 },
});
