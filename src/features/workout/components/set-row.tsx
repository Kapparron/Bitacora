import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useConfirm } from '@/components/confirm-dialog';
import { ThemedText } from '@/components/themed-text';
import type { Exercise, WorkoutSet } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber } from '@/lib/format';
import type { SetPatch } from '../mutations';
import { SET_TYPES, SetTypeSheet, type SetType } from './set-type-sheet';

/** How long typing pauses before the value reaches the database. */
const WRITE_DELAY_MS = 400;

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
function fieldsFor(
  trackingType: Exercise['trackingType']
): ('weight' | 'reps' | 'duration' | 'distance')[] {
  switch (trackingType) {
    case 'reps':
      return ['reps'];
    case 'duration':
      return ['duration'];
    case 'distance_duration':
      return ['distance', 'duration'];
    default:
      // Reps first, matching how a set is said out loud: 12 by 60 kg.
      return ['reps', 'weight'];
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
      <ThemedText
        type="small"
        themeColor="textSecondary"
        numberOfLines={1}
        style={styles.previousCell}>
        ANTERIOR
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
  /** Set number, or the letter of its type; see badgeFor. */
  label: string;
  previous: WorkoutSet | null;
  /** True when this set reaches a record, which puts a medal on its number. */
  record: boolean;
  trackingType: Exercise['trackingType'];
  editable: boolean;
  /** Callbacks take the set id so the parent can keep them stable across renders. */
  onChange: (setId: string, patch: SetPatch) => void;
  onToggleCompleted: (set: WorkoutSet, previous: WorkoutSet | null) => void;
  onChangeType: (setId: string, type: SetType) => void;
  onDelete: (setId: string) => void;
};

function SetRowComponent({
  set,
  label,
  previous,
  record,
  trackingType,
  editable,
  onChange,
  onToggleCompleted,
  onChangeType,
  onDelete,
}: SetRowProps) {
  const theme = useTheme();
  const confirm = useConfirm();
  const fields = fieldsFor(trackingType);
  const [typeSheetOpen, setTypeSheetOpen] = useState(false);

  // Local state keeps the caret stable while typing.
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

  /**
   * Writes are debounced because every write wakes the session's change listener,
   * which reloads the whole session. Typing "62,5" wrote four times and reloaded
   * four times. The pending patch is flushed before anything that reads the row
   * back from the database, and on unmount so a half-typed value is not lost.
   */
  const pendingPatch = useRef<SetPatch>({});
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (writeTimer.current) {
      clearTimeout(writeTimer.current);
      writeTimer.current = null;
    }

    const patch = pendingPatch.current;
    pendingPatch.current = {};

    if (Object.keys(patch).length > 0) onChange(set.id, patch);
  }, [onChange, set.id]);

  const flushRef = useRef(flush);
  flushRef.current = flush;

  useEffect(() => () => flushRef.current(), []);

  function edit(field: (typeof fields)[number], text: string) {
    setDraft((current) => ({ ...current, [field]: text }));

    const value = parseDecimal(text);
    const patch: SetPatch =
      field === 'weight'
        ? { weight: value }
        : field === 'reps'
          ? { reps: value === null ? null : Math.round(value) }
          : field === 'duration'
            ? { durationS: value === null ? null : Math.round(value) }
            : { distanceM: value };

    pendingPatch.current = { ...pendingPatch.current, ...patch };

    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => flushRef.current(), WRITE_DELAY_MS);
  }

  async function confirmDelete() {
    const accepted = await confirm({
      title: 'Borrar serie',
      message:
        set.type === 'normal'
          ? `Se borra la serie ${label}.`
          : `Se borra la serie de tipo ${SET_TYPES.find((option) => option.value === set.type)?.label}.`,
      confirmLabel: 'Borrar',
    });

    if (accepted) onDelete(set.id);
  }

  const labelColor = set.type === 'normal' ? theme.text : theme.accentText;

  return (
    <View style={[styles.row, set.completed && { backgroundColor: theme.backgroundSelected }]}>
      <Pressable
        onPress={editable ? () => setTypeSheetOpen(true) : undefined}
        onLongPress={editable ? () => void confirmDelete() : undefined}
        style={styles.indexCell}>
        {record ? (
          <Ionicons name="medal" size={18} color={theme.accentText} accessibilityLabel="Record" />
        ) : (
          <ThemedText type="smallBold" style={{ color: labelColor }}>
            {label}
          </ThemedText>
        )}
      </Pressable>

      <ThemedText
        type="small"
        themeColor="textSecondary"
        numberOfLines={1}
        style={styles.previousCell}>
        {describePrevious(previous, trackingType)}
      </ThemedText>

      {/* Mounted only while open: a session has dozens of set rows, and every
          mounted Modal is a native window even when it is not visible. */}
      {typeSheetOpen ? (
        <SetTypeSheet
          current={set.type}
          onSelect={(type) => {
            setTypeSheetOpen(false);
            onChangeType(set.id, type);
          }}
          onDelete={() => {
            setTypeSheetOpen(false);
            void confirmDelete();
          }}
          onClose={() => setTypeSheetOpen(false)}
        />
      ) : null}

      {fields.map((field) => (
        <TextInput
          key={field}
          value={draft[field]}
          onChangeText={(text) => edit(field, text)}
          onBlur={() => flush()}
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
        onPress={
          editable
            ? () => {
                // completeSet reads the row back, so pending edits must land first.
                flush();
                onToggleCompleted(set, previous);
              }
            : undefined
        }
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

/**
 * Every session reload builds new row objects, so identity comparison would
 * never skip a render. Only the fields this row draws are compared.
 */
export const SetRow = memo(SetRowComponent, (before, after) => {
  const a = before.set;
  const b = after.set;

  return (
    a.id === b.id &&
    a.type === b.type &&
    a.completed === b.completed &&
    a.weight === b.weight &&
    a.reps === b.reps &&
    a.durationS === b.durationS &&
    a.distanceM === b.distanceM &&
    before.label === after.label &&
    before.previous === after.previous &&
    before.record === after.record &&
    before.trackingType === after.trackingType &&
    before.editable === after.editable &&
    before.onChange === after.onChange &&
    before.onToggleCompleted === after.onToggleCompleted &&
    before.onChangeType === after.onChangeType &&
    before.onDelete === after.onDelete
  );
});

/**
 * What this set was last time, as one string: `12x60kg`, or whatever the
 * exercise is measured in. A dash when the exercise has no history yet, or when
 * last time went no further than this set.
 */
function describePrevious(
  previous: WorkoutSet | null,
  trackingType: Exercise['trackingType']
): string {
  if (!previous) return '-';

  switch (trackingType) {
    case 'reps':
      return previous.reps != null ? `${previous.reps} reps` : '-';
    case 'duration':
      return previous.durationS != null ? `${previous.durationS} s` : '-';
    case 'distance_duration': {
      const parts = [
        previous.distanceM != null ? `${formatNumber(previous.distanceM)} m` : null,
        previous.durationS != null ? `${previous.durationS} s` : null,
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(' · ') : '-';
    }
    default:
      if (previous.reps == null && previous.weight == null) return '-';
      if (previous.weight == null) return `${previous.reps} reps`;
      if (previous.reps == null) return `${formatNumber(previous.weight)}kg`;
      return `${previous.reps}x${formatNumber(previous.weight)}kg`;
  }
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
  // Wide enough for "ANTERIOR" and for a figure like 12x62,5kg.
  previousCell: { width: 74, textAlign: 'center' },
  inputCell: { flex: 1, textAlign: 'center' },
  input: { borderRadius: 8, paddingVertical: 8, fontSize: 16, fontWeight: '600' },
  checkCell: { width: 40, alignItems: 'center' },
});
