import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { WorkoutSet } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

export type SetType = WorkoutSet['type'];

export const SET_TYPES: { value: SetType; label: string; badge: string; description: string }[] = [
  { value: 'normal', label: 'Serie normal', badge: '#', description: 'Cuenta para el volumen' },
  {
    value: 'warmup',
    label: 'Calentamiento',
    badge: 'C',
    description: 'No cuenta para el volumen',
  },
  { value: 'drop', label: 'Drop set', badge: 'D', description: 'Bajada de peso sin descanso' },
  { value: 'failure', label: 'Al fallo', badge: 'F', description: 'Hasta el fallo muscular' },
];

/** Badge shown in the set-number column; normal sets keep their number. */
export function badgeFor(type: SetType, index: number): string {
  return type === 'normal' ? String(index + 1) : (SET_TYPES.find((t) => t.value === type)?.badge ?? '');
}

/** Render this only while it is open; see the note in SetRow. */
export function SetTypeSheet({
  current,
  onSelect,
  onClose,
}: {
  current: SetType;
  onSelect: (type: SetType) => void;
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
            TIPO DE SERIE
          </ThemedText>

          {SET_TYPES.map((type) => {
            const selected = type.value === current;

            return (
              <Pressable
                key={type.value}
                onPress={() => onSelect(type.value)}
                style={({ pressed }) => [
                  styles.option,
                  pressed && { backgroundColor: theme.backgroundElement },
                ]}>
                <View style={[styles.badge, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="smallBold" style={{ color: theme.accent }}>
                    {type.badge}
                  </ThemedText>
                </View>

                <View style={styles.optionText}>
                  <ThemedText type="default">{type.label}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {type.description}
                  </ThemedText>
                </View>

                {selected ? (
                  <Ionicons name="checkmark" size={20} color={theme.accent} />
                ) : null}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 4,
  },
  heading: { paddingHorizontal: 20, paddingBottom: 8 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 12 },
  badge: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, gap: 2 },
});
