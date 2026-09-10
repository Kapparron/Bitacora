import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { recordWeight } from '@/features/body/mutations';
import { useLatestWeight } from '@/features/body/queries';
import {
  ACTIVITY_LEVELS,
  estimateGoal,
  type ActivityLevel,
  type Sex,
} from '@/features/nutrition/calorie-goal';
import { setGoal } from '@/features/nutrition/mutations';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, toIsoDay } from '@/lib/format';

/** Weekly changes worth offering. Beyond a kilogram a week nothing holds. */
const WEEKLY_CHANGES = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5];

function parse(value: string): number | null {
  const parsed = Number(value.replace(',', '.').trim());
  return Number.isFinite(parsed) && value.trim() !== '' ? parsed : null;
}

function describeChange(value: number): string {
  if (value === 0) return 'Mantener';
  return `${value > 0 ? '+' : ''}${formatNumber(value, 2)} kg`;
}

/**
 * Works out a daily calorie target from body data, and saves the weight it asked
 * for as today's measurement: it is the same number the weight section tracks,
 * and asking twice for it would be asking twice.
 */
export function GoalCalculator({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const theme = useTheme();
  const latest = useLatestWeight();

  const [sex, setSex] = useState<Sex>('male');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState(latest?.weight != null ? String(latest.weight) : '');
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [weeklyChange, setWeeklyChange] = useState(0);

  const years = parse(age);
  const heightCm = parse(height);
  const weightKg = parse(weight);

  const estimate =
    years !== null && years > 0 && heightCm !== null && heightCm > 0 && weightKg !== null && weightKg > 0
      ? estimateGoal({ sex, age: years, heightCm, weightKg, activity, weeklyChangeKg: weeklyChange })
      : null;

  async function save() {
    if (!estimate || weightKg === null) return;

    const today = toIsoDay();
    // Dated today, so past days keep the goal they were judged against.
    await setGoal({
      effectiveFrom: today,
      kcal: estimate.kcal,
      protein: estimate.protein,
      carbs: estimate.carbs,
      fat: estimate.fat,
    });
    await recordWeight(today, weightKg);
    onDone();
  }

  return (
    <View style={styles.form}>
      <ThemedText type="small" themeColor="textSecondary">
        Genero
      </ThemedText>
      <View style={styles.chips}>
        <Chip label="Hombre" active={sex === 'male'} onPress={() => setSex('male')} />
        <Chip label="Mujer" active={sex === 'female'} onPress={() => setSex('female')} />
      </View>

      <Field label="Edad (anos)" value={age} onChange={setAge} />
      <Field label="Altura (cm)" value={height} onChange={setHeight} />
      <Field label="Peso (kg)" value={weight} onChange={setWeight} />

      <ThemedText type="small" themeColor="textSecondary">
        Actividad
      </ThemedText>
      <View style={styles.chips}>
        {ACTIVITY_LEVELS.map((level) => (
          <Chip
            key={level.value}
            label={level.label}
            active={activity === level.value}
            onPress={() => setActivity(level.value)}
          />
        ))}
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        Cambio por semana
      </ThemedText>
      <View style={styles.chips}>
        {WEEKLY_CHANGES.map((value) => (
          <Chip
            key={value}
            label={describeChange(value)}
            active={weeklyChange === value}
            onPress={() => setWeeklyChange(value)}
          />
        ))}
      </View>

      {estimate ? (
        <View style={[styles.result, { borderColor: theme.border }]}>
          <ThemedText type="subtitle" style={styles.kcal}>
            {formatNumber(estimate.kcal, 0)} kcal
          </ThemedText>

          <ThemedText type="small" themeColor="textSecondary">
            Gasto en reposo {formatNumber(estimate.bmr, 0)} · mantenimiento{' '}
            {formatNumber(estimate.maintenance, 0)} kcal
          </ThemedText>

          <ThemedText type="small" themeColor="textSecondary">
            Proteina {estimate.protein} g · Carbos {estimate.carbs} g · Grasa {estimate.fat} g
          </ThemedText>

          {estimate.clamped ? (
            <ThemedText type="small" style={{ color: theme.danger }}>
              Ese ritmo dejaba las calorias por debajo de lo sostenible. El objetivo se ha subido al
              minimo recomendado.
            </ThemedText>
          ) : null}

          <ThemedText type="small" themeColor="textSecondary">
            Es una estimacion de partida. Ajustala segun lo que marque la bascula en dos o tres
            semanas.
          </ThemedText>
        </View>
      ) : null}

      <Button title="Guardar objetivo" disabled={estimate === null} onPress={() => void save()} />
      <Button title="Cancelar" variant="secondary" onPress={onCancel} />
    </View>
  );
}

function Chip({
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
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
        keyboardType="decimal-pad"
        style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 10 },
  field: { gap: 4 },
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  result: { padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, gap: 4 },
  kcal: { fontSize: 26, lineHeight: 32 },
});
