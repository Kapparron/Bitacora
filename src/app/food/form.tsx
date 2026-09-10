import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { createCustomFood, updateFood } from '@/features/nutrition/mutations';
import { getFood, type Meal } from '@/features/nutrition/queries';
import { useTheme } from '@/hooks/use-theme';

function parse(value: string): number | null {
  const parsed = Number(value.replace(',', '.').trim());
  return Number.isFinite(parsed) && value.trim() !== '' ? parsed : null;
}

function toText(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

/**
 * Creates a food, or edits one that exists when `foodId` is given.
 *
 * Creating by hand is not a fallback but a necessity: a fifth of Open Food Facts
 * products carry no energy value, and home cooking is not in there at all.
 * Editing matters for the same reason — a cached product's values are often
 * close but wrong.
 */
export default function FoodFormScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { date, meal, foodId } = useLocalSearchParams<{
    date: string;
    meal: Meal;
    foodId?: string;
  }>();

  const editing = Boolean(foodId);
  const { data: food } = useQuery({
    queryKey: ['food', foodId],
    queryFn: () => getFood(foodId as string),
    enabled: editing,
  });

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [serving, setServing] = useState('');

  useEffect(() => {
    if (!food) return;

    setName(food.name);
    setBrand(food.brand ?? '');
    setKcal(String(food.kcalPer100g));
    setProtein(toText(food.proteinPer100g));
    setCarbs(toText(food.carbsPer100g));
    setFat(toText(food.fatPer100g));
    setServing(toText(food.servingSizeG));
  }, [food]);

  const energy = parse(kcal);
  const valid = name.trim().length > 0 && energy !== null && energy >= 0;

  async function save() {
    if (!valid || energy === null) return;

    const values = {
      name: name.trim(),
      brand: brand.trim() || null,
      kcalPer100g: energy,
      proteinPer100g: parse(protein),
      carbsPer100g: parse(carbs),
      fatPer100g: parse(fat),
      servingSizeG: parse(serving),
    };

    if (editing && foodId) {
      await updateFood(foodId, values);
      router.back();
      return;
    }

    const created = await createCustomFood(values);
    router.replace({ pathname: '/food/amount', params: { foodId: created.id, date, meal } });
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={editing ? 'Editar alimento' : 'Nuevo alimento'}
        subtitle="Valores por 100 g"
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="Nombre" value={name} onChange={setName} autoFocus={!editing} />
        <Field label="Marca (opcional)" value={brand} onChange={setBrand} />
        <Field label="Calorias por 100 g" value={kcal} onChange={setKcal} numeric />
        <Field label="Proteina por 100 g" value={protein} onChange={setProtein} numeric />
        <Field label="Carbohidratos por 100 g" value={carbs} onChange={setCarbs} numeric />
        <Field label="Grasa por 100 g" value={fat} onChange={setFat} numeric />
        <Field label="Gramos por racion (opcional)" value={serving} onChange={setServing} numeric />

        <Button
          title={editing ? 'Guardar cambios' : 'Crear y anadir'}
          disabled={!valid}
          onPress={() => void save()}
        />

        {editing ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
            Los registros ya guardados no cambian: cada uno conserva los macros con los que se
            anoto.
          </ThemedText>
        ) : null}
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
  note: { textAlign: 'center' },
});
