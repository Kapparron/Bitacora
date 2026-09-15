import { asc, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { TRACKING_TYPES } from '@/constants/sets';
import { db } from '@/db/client';
import { exercises, type Exercise } from '@/db/schema';
import { createCustomExercise } from '@/features/exercises/mutations';
import { useTheme } from '@/hooks/use-theme';

/**
 * Creates an exercise the catalogue does not have. The muscle groups and the
 * equipment already in use are offered as chips, so a custom exercise files
 * itself under the same headings as the rest instead of starting a section of
 * one.
 */
export default function NewExerciseScreen() {
  const theme = useTheme();
  const router = useRouter();

  // Distinct values rather than the catalogue: the chips need some thirty rows,
  // and reading all 1.324 to build them was the slowest thing on this screen.
  const { data: groups } = useLiveQuery(
    db
      .selectDistinct({ value: exercises.muscleGroup })
      .from(exercises)
      .where(isNull(exercises.deletedAt))
      .orderBy(asc(exercises.muscleGroup)),
  );

  const { data: equipmentOptions } = useLiveQuery(
    db
      .selectDistinct({ value: exercises.equipment })
      .from(exercises)
      .where(isNull(exercises.deletedAt))
      .orderBy(asc(exercises.equipment)),
  );

  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [equipment, setEquipment] = useState('');
  const [trackingType, setTrackingType] = useState<Exercise['trackingType']>('weight_reps');
  const [saving, setSaving] = useState(false);

  const ready = name.trim() !== '' && muscleGroup.trim() !== '' && equipment.trim() !== '';

  async function save() {
    if (!ready || saving) return;
    setSaving(true);

    const id = await createCustomExercise({
      name: name.trim(),
      muscleGroup: muscleGroup.trim(),
      equipment: equipment.trim(),
      trackingType,
    });

    // Straight to the exercise that was just created, replacing this form so
    // going back does not reopen it.
    router.replace({ pathname: '/exercise/[id]', params: { id } });
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Nuevo ejercicio" />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="Nombre" value={name} onChange={setName} placeholder="Press banca con banda" />

        <Field
          label="Grupo muscular"
          value={muscleGroup}
          onChange={setMuscleGroup}
          placeholder="pecho"
        />
        <Chips
          values={groups.map((row) => row.value)}
          current={muscleGroup}
          onSelect={setMuscleGroup}
        />

        <Field label="Material" value={equipment} onChange={setEquipment} placeholder="banda" />
        <Chips
          values={equipmentOptions.map((row) => row.value)}
          current={equipment}
          onSelect={setEquipment}
        />

        <ThemedText type="small" themeColor="textSecondary">
          Como se mide
        </ThemedText>
        <View style={styles.chips}>
          {TRACKING_TYPES.map((option) => (
            <Chip
              key={option.id}
              label={option.label}
              active={option.id === trackingType}
              onPress={() => setTrackingType(option.id)}
            />
          ))}
        </View>

        <Button title="Crear ejercicio" disabled={!ready || saving} onPress={() => void save()} />
      </ScrollView>
    </View>
  );
}

function Chips({
  values,
  current,
  onSelect,
}: {
  values: string[];
  current: string;
  onSelect: (value: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.chips}>
      {values.map((value) => (
        <Chip
          key={value}
          label={value}
          active={value === current}
          onPress={() => onSelect(value)}
        />
      ))}
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
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

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        autoCorrect={false}
        style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 12, gap: 10, paddingBottom: 48 },
  field: { gap: 4 },
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  chips: { gap: 8, paddingRight: 12 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
});
