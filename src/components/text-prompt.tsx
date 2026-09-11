import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

/**
 * Themed one-field dialog, for naming things. Like the confirm dialog, it is
 * drawn in-app because the platform's own prompt cannot be styled and does not
 * exist at all on Android.
 *
 * Render it only while it is open.
 */
export function TextPrompt({
  title,
  message,
  placeholder,
  initialValue = '',
  confirmLabel = 'Guardar',
  keyboardType,
  onSubmit,
  onCancel,
}: {
  title: string;
  message?: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  keyboardType?: KeyboardTypeOptions;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const [value, setValue] = useState(initialValue);
  const empty = value.trim().length === 0;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        {/* Swallows taps on the card so they do not reach the backdrop. */}
        <Pressable
          style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}
          onPress={() => {}}>
          <ThemedText type="default" style={styles.title}>
            {title}
          </ThemedText>

          {message ? (
            <ThemedText type="small" themeColor="textSecondary">
              {message}
            </ThemedText>
          ) : null}

          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={theme.textSecondary}
            keyboardType={keyboardType}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => {
              if (!empty) onSubmit(value.trim());
            }}
            style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
          />

          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.action,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="default" style={styles.actionLabel}>
                Cancelar
              </ThemedText>
            </Pressable>

            <Pressable
              disabled={empty}
              onPress={() => onSubmit(value.trim())}
              style={({ pressed }) => [
                styles.action,
                { backgroundColor: theme.accent },
                (pressed || empty) && styles.pressed,
              ]}>
              <ThemedText type="default" style={[styles.actionLabel, { color: theme.onAccent }]}>
                {confirmLabel}
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
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
  title: { fontWeight: '700' },
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  actions: { flexDirection: 'row', gap: 8, paddingTop: 4 },
  action: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  actionLabel: { fontWeight: '600' },
  pressed: { opacity: 0.6 },
});
