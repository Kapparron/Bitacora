import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { createCustomFood } from '@/features/nutrition/mutations';
import type { Meal } from '@/features/nutrition/queries';
import { useTheme } from '@/hooks/use-theme';

function parse(value: string): number | null {
  const parsed = Number(value.replace(',', '.').trim());
  return Number.isFinite(parsed) && value.trim() !== '' ? parsed : null;
}

/**
 * Creating a food by hand. Not a fallback but a necessity: a fifth of Open Food
 * Facts products have no energy value, and home cooking is not in there at all.
 */
export default function NewFoodScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { date, meal } = useLocalSearchParams<{ date: string; meal: Meal }>();

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [serving, setServing] = useState('');

  const energy = parse(kcal);
  const valid = name.trim().length > 0 && energy !== null && energy >= 0;

  async function save() {
    if (!valid || energy === null) return;

    const food = await createCustomFood({
      name: name.trim(),
      brand: brand.trim() || null,
      kcalPer100g: energy,
      proteinPer100g: parse(protein),
      carbsPer100g: parse(carbs),
      fatPer100g: parse(fat),
      servingSizeG: parse(serving),
    });

    router.replace({ pathname: '/food/amount', params: { foodId: food.id, date, meal } });
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Nuevo alimento" subtitle="Valores por 100 g" />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="Nombre" value={name} onChange={setName} autoFocus />
        <Field label="Marca (opcional)" value={brand} onChange={setBrand} />
        <Field label="Calorias por 100 g" value={kcal} onChange={setKcal} numeric />
        <Field label="Proteina por 100 g" value={protein} onChange={setProtein} numeric />
        <Field label="Carbohidratos por 100 g" value={carbs} onChange={setCarbs} numeric />
        <Field label="Grasa por 100 g" value={fat} onChange={setFat} numeric />
        <Field
          label="Gramos por racion (opcional)"
          value={serving}
          onChange={setServing}
          numeric
        />

        <Button title="Crear y anadir" disabled={!valid} onPress={() => void save()} />
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  numeric,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  numeric?: boolean;
  autoFocus?: boolean;
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
        autoFocus={autoFocus}
        autoCorrect={false}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 48 },
  field: { gap: 4 },
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
});
