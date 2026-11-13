import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

import { updateWorkoutExerciseNotes } from '../mutations';
import { normalizeNote } from '../note';

/**
 * The note under an exercise, for what the numbers do not say: a grip, a sore
 * shoulder, a seat setting.
 *
 * Read-only it shows the note, and shows nothing at all when there is none, so
 * an empty note takes no room. Editable it is a field that saves when it loses
 * focus, with no button, like the sets above it. What is half typed is also
 * saved when the card goes away, so leaving the screen never drops it.
 */
export function ExerciseNote({
  workoutExerciseId,
  notes,
  editable,
}: {
  workoutExerciseId: string;
  notes: string | null;
  editable: boolean;
}) {
  const theme = useTheme();
  const [draft, setDraft] = useState(notes ?? '');
  const focused = useRef(false);

  // The latest values, for the unmount save below.
  const latest = useRef({ draft, notes, workoutExerciseId });
  latest.current = { draft, notes, workoutExerciseId };

  // A note changed from outside (the exercise was replaced, or the session was
  // reloaded) is taken in, unless the field is being typed in.
  useEffect(() => {
    if (!focused.current) setDraft(notes ?? '');
  }, [notes]);

  function save() {
    const next = normalizeNote(latest.current.draft);
    if (next !== latest.current.notes) {
      void updateWorkoutExerciseNotes(latest.current.workoutExerciseId, next);
    }
  }

  useEffect(
    () => () => {
      if (focused.current) save();
    },
    // Only on unmount: `save` reads everything through the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  if (!editable) {
    if (!notes) return null;

    return (
      <View style={styles.row}>
        <Ionicons name="document-text-outline" size={16} color={theme.textSecondary} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
          {notes}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Ionicons name="document-text-outline" size={16} color={theme.textSecondary} />
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onFocus={() => {
          focused.current = true;
        }}
        onBlur={() => {
          focused.current = false;
          save();
        }}
        multiline
        placeholder="Anadir nota"
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel="Nota del ejercicio"
        style={[styles.input, { color: theme.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingHorizontal: 12, paddingTop: 6 },
  text: { flex: 1 },
  input: { flex: 1, fontSize: 14, paddingVertical: 0 },
});
