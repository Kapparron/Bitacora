import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/screen-header';
import { Chip } from '@/components/chip';
import { ThemedText } from '@/components/themed-text';
import { TRACKING_TYPES } from '@/constants/sets';
import type { Exercise } from '@/db/schema';
import { createCustomExercise } from '@/features/exercises/mutations';
import { useEquipment, useMuscleGroups } from '@/features/exercises/queries';
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

  const groups = useMuscleGroups();
  const equipmentOptions = useEquipment();

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
          values={groups}
          current={muscleGroup}
          onSelect={setMuscleGroup}
        />

        <Field label="Material" value={equipment} onChange={setEquipment} placeholder="banda" />
        <Chips
          values={equipmentOptions}
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
});
