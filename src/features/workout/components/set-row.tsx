import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useConfirm } from '@/components/confirm-dialog';
import { ThemedText } from '@/components/themed-text';
import type { Exercise, WorkoutSet } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber } from '@/lib/format';
import type { SetPatch } from '../mutations';

/** Accepts both "62.5" and "62,5"; returns null for anything not a number. */
function parseDecimal(text: string): number | null {
  const normalized = text.replace(',', '.').trim();
  if (normalized === '') return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function toText(value: number | null): string {
  return value === null ? '' : String(value);
}

/** Which numeric fields a set shows, decided by how the exercise is measured. */
function fieldsFor(trackingType: Exercise['trackingType']): ('weight' | 'reps' | 'duration' | 'distance')[] {
  switch (trackingType) {
    case 'reps':
      return ['reps'];
    case 'duration':
      return ['duration'];
    case 'distance_duration':
      return ['distance', 'duration'];
    default:
      return ['weight', 'reps'];
  }
}

const FIELD_LABEL = {
  weight: 'KG',
  reps: 'REPS',
  duration: 'SEG',
  distance: 'METROS',
} as const;

export function SetRowHeader({ trackingType }: { trackingType: Exercise['trackingType'] }) {
  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.indexCell}>
        SERIE
      </ThemedText>
      {fieldsFor(trackingType).map((field) => (
        <ThemedText key={field} type="small" themeColor="textSecondary" style={styles.inputCell}>
          {FIELD_LABEL[field]}
        </ThemedText>
      ))}
      <View style={styles.checkCell} />
    </View>
  );
}

export type SetRowProps = {
  set: WorkoutSet;
  index: number;
  previous: WorkoutSet | null;
  trackingType: Exercise['trackingType'];
  editable: boolean;
  onChange: (patch: SetPatch) => void;
  onToggleCompleted: () => void;
  onCycleType: () => void;
  onDelete: () => void;
};

export function SetRow({
  set,
  index,
  previous,
  trackingType,
  editable,
  onChange,
  onToggleCompleted,
  onCycleType,
  onDelete,
}: SetRowProps) {
  const theme = useTheme();
  const confirm = useConfirm();
  const fields = fieldsFor(trackingType);

  // Local state keeps the caret stable while typing; the database is written on
  // every keystroke because a local SQLite write costs well under a frame.
  const [draft, setDraft] = useState(() => ({
    weight: toText(set.weight),
    reps: toText(set.reps),
    duration: toText(set.durationS),
    distance: toText(set.distanceM),
  }));

  useEffect(() => {
    setDraft({
      weight: toText(set.weight),
      reps: toText(set.reps),
      duration: toText(set.durationS),
      distance: toText(set.distanceM),
    });
    // Only resync when the row is replaced by a different set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.id]);

  function edit(field: (typeof fields)[number], text: string) {
    setDraft((current) => ({ ...current, [field]: text }));
    const value = parseDecimal(text);

    switch (field) {
      case 'weight':
        return onChange({ weight: value });
      case 'reps':
        return onChange({ reps: value === null ? null : Math.round(value) });
      case 'duration':
        return onChange({ durationS: value === null ? null : Math.round(value) });
      case 'distance':
        return onChange({ distanceM: value });
    }
  }

  async function confirmDelete() {
    const accepted = await confirm({
      title: 'Borrar serie',
      message: `Se borra la serie ${index + 1}.`,
      confirmLabel: 'Borrar',
      destructive: true,
    });

    if (accepted) onDelete();
  }

  const label = set.type === 'warmup' ? 'C' : String(index + 1);
  const labelColor = set.type === 'warmup' ? theme.accent : theme.text;

  return (
    <View
      style={[
        styles.row,
        set.completed && { backgroundColor: theme.backgroundSelected },
      ]}>
      <Pressable
        onPress={editable ? onCycleType : undefined}
        onLongPress={editable ? () => void confirmDelete() : undefined}
        style={styles.indexCell}>
        <ThemedText type="smallBold" style={{ color: labelColor }}>
          {label}
        </ThemedText>
      </Pressable>

      {fields.map((field) => (
        <TextInput
          key={field}
          value={draft[field]}
          onChangeText={(text) => edit(field, text)}
          editable={editable}
          keyboardType="decimal-pad"
          selectTextOnFocus
          placeholder={previousPlaceholder(field, previous)}
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.inputCell,
            styles.input,
            { backgroundColor: theme.backgroundElement, color: theme.text },
          ]}
        />
      ))}

      <Pressable
        onPress={editable ? onToggleCompleted : undefined}
        style={styles.checkCell}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: set.completed }}>
        <Ionicons
          name={set.completed ? 'checkmark-circle' : 'ellipse-outline'}
          size={26}
          color={set.completed ? theme.success : theme.textSecondary}
        />
      </Pressable>
    </View>
  );
}

/** Last session's value, shown greyed out so one tap on the check reuses it. */
function previousPlaceholder(field: string, previous: WorkoutSet | null): string {
  if (!previous) return '';
  switch (field) {
    case 'weight':
      return previous.weight != null ? formatNumber(previous.weight) : '';
    case 'reps':
      return previous.reps != null ? String(previous.reps) : '';
    case 'duration':
      return previous.durationS != null ? String(previous.durationS) : '';
    case 'distance':
      return previous.distanceM != null ? formatNumber(previous.distanceM) : '';
    default:
      return '';
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  // Wide enough for the "SERIE" header to fit on one line.
  indexCell: { width: 48, alignItems: 'center' },
  inputCell: { flex: 1, textAlign: 'center' },
  input: { borderRadius: 8, paddingVertical: 8, fontSize: 16, fontWeight: '600' },
  checkCell: { width: 40, alignItems: 'center' },
});
