import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { setGoal } from '@/features/nutrition/mutations';
import { useGoalFor } from '@/features/nutrition/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, toIsoDay } from '@/lib/format';

function parse(value: string): number | null {
  const parsed = Number(value.replace(',', '.').trim());
  return Number.isFinite(parsed) && value.trim() !== '' ? parsed : null;
}

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const today = toIsoDay();
  const goal = useGoalFor(today);

  const [editing, setEditing] = useState(false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { borderColor: theme.border }]}>
          <ThemedText type="small" themeColor="textSecondary">
            OBJETIVO DIARIO
          </ThemedText>

          {goal && !editing ? (
            <>
              <ThemedText type="subtitle" style={styles.kcal}>
                {formatNumber(goal.kcal, 0)} kcal
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {goal.protein ? `Proteina ${formatNumber(goal.protein, 0)} g` : 'Sin proteina'} ·{' '}
                {goal.carbs ? `Carbos ${formatNumber(goal.carbs, 0)} g` : 'sin carbos'} ·{' '}
                {goal.fat ? `Grasa ${formatNumber(goal.fat, 0)} g` : 'sin grasa'}
              </ThemedText>
              <Button title="Cambiar objetivo" variant="secondary" onPress={() => setEditing(true)} />
            </>
          ) : (
            <GoalForm
              initial={goal}
              onCancel={goal ? () => setEditing(false) : undefined}
              onSave={async (values) => {
                // Dated today, so past days keep the goal they were judged against.
                await setGoal({ effectiveFrom: today, ...values });
                setEditing(false);
              }}
            />
          )}
        </View>

        <View style={[styles.card, { borderColor: theme.border }]}>
          <ThemedText type="small" themeColor="textSecondary">
            DATOS
          </ThemedText>

          <Button title="Progreso" variant="secondary" onPress={() => router.push('/progress')} />
          <Button
            title="Peso corporal"
            variant="secondary"
            onPress={() => router.push('/body')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function GoalForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: { kcal: number; protein: number | null; carbs: number | null; fat: number | null } | null;
  onSave: (values: {
    kcal: number;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  }) => void;
  onCancel?: () => void;
}) {
  const [kcal, setKcal] = useState(initial ? String(initial.kcal) : '');
  const [protein, setProtein] = useState(initial?.protein ? String(initial.protein) : '');
  const [carbs, setCarbs] = useState(initial?.carbs ? String(initial.carbs) : '');
  const [fat, setFat] = useState(initial?.fat ? String(initial.fat) : '');

  const energy = parse(kcal);

  return (
    <View style={styles.form}>
      <Field label="Calorias" value={kcal} onChange={setKcal} />
      <Field label="Proteina (g)" value={protein} onChange={setProtein} />
      <Field label="Carbohidratos (g)" value={carbs} onChange={setCarbs} />
      <Field label="Grasa (g)" value={fat} onChange={setFat} />

      <Button
        title="Guardar objetivo"
        disabled={energy === null || energy <= 0}
        onPress={() => {
          if (energy === null) return;
          onSave({ kcal: energy, protein: parse(protein), carbs: parse(carbs), fat: parse(fat) });
        }}
      />

      {onCancel ? <Button title="Cancelar" variant="secondary" onPress={onCancel} /> : null}
    </View>
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
  container: { flex: 1 },
  content: { padding: 12, gap: 12, paddingBottom: 120 },
  card: { padding: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: 8 },
  kcal: { fontSize: 30, lineHeight: 36 },
  form: { gap: 10 },
  field: { gap: 4 },
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
});
