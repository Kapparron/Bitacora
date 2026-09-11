import { createContext, use, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  /** `null` hides the cancel button, turning the dialog into a notice. */
  cancelLabel?: string | null;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Themed replacement for `Alert.alert`. The native dialog is rendered by the OS
 * and exposes no styling, so confirmations are drawn in-app instead.
 */
export function useConfirm(): ConfirmFn {
  const confirm = use(ConfirmContext);
  if (!confirm) throw new Error('useConfirm must be used inside ConfirmProvider');
  return confirm;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((next) => {
    // A second request while one is open would strand the first promise.
    resolveRef.current?.(false);

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setOptions(next);
    });
  }, []);

  const close = useCallback((result: boolean) => {
    setOptions(null);
    resolveRef.current?.(result);
    resolveRef.current = null;
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext value={value}>
      {children}

      <Modal
        visible={options !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => close(false)}>
        <Pressable style={styles.backdrop} onPress={() => close(false)}>
          {/* Swallows taps on the card so they do not reach the backdrop. */}
          <Pressable
            style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}
            onPress={() => {}}>
            <ThemedText type="default" style={styles.title}>
              {options?.title}
            </ThemedText>

            {options?.message ? (
              <ThemedText type="small" themeColor="textSecondary">
                {options.message}
              </ThemedText>
            ) : null}

            <View style={styles.actions}>
              {options?.cancelLabel === null ? null : (
                <Pressable
                  onPress={() => close(false)}
                  style={({ pressed }) => [
                    styles.action,
                    { backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="default" style={styles.actionLabel}>
                    {options?.cancelLabel ?? 'Cancelar'}
                  </ThemedText>
                </Pressable>
              )}

              <Pressable
                onPress={() => close(true)}
                style={({ pressed }) => [
                  styles.action,
                  { backgroundColor: theme.accent },
                  pressed && styles.pressed,
                ]}>
                <ThemedText
                  type="default"
                  style={[styles.actionLabel, { color: theme.onAccent }]}>
                  {options?.confirmLabel ?? 'Aceptar'}
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ConfirmContext>
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
    gap: 8,
  },
  title: { fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8, paddingTop: 12 },
  action: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  actionLabel: { fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
