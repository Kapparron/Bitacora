import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { logFood, moveEntry, toggleFavorite, updateEntryAmount } from '@/features/nutrition/mutations';
import { MEALS, getEntry, getFood, type Meal } from '@/features/nutrition/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber } from '@/lib/format';

/** Amounts people actually weigh, so the common case is one tap. */
const QUICK_GRAMS = [30, 50, 100, 150, 200, 250];

/**
 * Sets how much of a food to log, or edits how much was logged when `entryId`
 * is given.
 */
export default function AmountScreen() {
  const theme = useTheme();
  const router = useRouter();
  const {
    foodId,
    entryId,
    date,
    meal: initialMeal,
  } = useLocalSearchParams<{
    foodId?: string;
    entryId?: string;
    date: string;
    meal: Meal;
  }>();

  const editing = Boolean(entryId);

  const { data: entry } = useQuery({
    queryKey: ['food-entry', entryId],
    queryFn: () => getEntry(entryId as string),
    enabled: editing,
  });

  const lookupId = foodId ?? entry?.foodId ?? null;
  const { data: food } = useQuery({
    queryKey: ['food', lookupId],
    queryFn: () => getFood(lookupId as string),
    enabled: lookupId !== null,
  });

  const [grams, setGrams] = useState('100');
  const [meal, setMeal] = useState<Meal>(initialMeal);

  useEffect(() => {
    if (!entry) return;
    setGrams(String(entry.grams));
    setMeal(entry.meal);
  }, [entry]);

  const amount = Number(grams.replace(',', '.')) || 0;

  /**
   * Per-100 g values to preview from. Normally the food's own; when the food it
   * came from has been deleted, they are recovered from the entry itself, which
   * keeps the macros it was saved with.
   */
  const per100 =
    food ??
    (entry && entry.grams > 0
      ? {
          name: entry.name,
          brand: entry.brand,
          kcalPer100g: (entry.kcal / entry.grams) * 100,
          proteinPer100g: entry.protein === null ? null : (entry.protein / entry.grams) * 100,
          carbsPer100g: entry.carbs === null ? null : (entry.carbs / entry.grams) * 100,
          fatPer100g: entry.fat === null ? null : (entry.fat / entry.grams) * 100,
          servingSizeG: null,
        }
      : null);

  if (!per100) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Cantidad" />
      </View>
    );
  }

  const factor = amount / 100;
  const kcal = per100.kcalPer100g * factor;

  async function save() {
    if (amount <= 0) return;

    if (editing && entryId && entry) {
      await updateEntryAmount(entryId, amount);
      if (meal !== entry.meal) await moveEntry(entryId, meal);
      router.back();
      return;
    }

    if (!food) return;

    await logFood({ date, meal, food, grams: amount });
    // Back past the search screen: the food is logged, so there is nothing to
    // return to there.
    router.dismissTo('/nutrition');
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={per100.name}
        subtitle={per100.brand ?? undefined}
        right={
          food ? (
            <Pressable onPress={() => void toggleFavorite(food.id, !food.isFavorite)} hitSlop={8}>
              <ThemedText type="small" style={{ color: theme.accentText, fontWeight: '700' }}>
                {food.isFavorite ? 'Quitar' : 'Favorito'}
              </ThemedText>
            </Pressable>
          ) : undefined
        }
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { borderColor: theme.border }]}>
          <ThemedText type="small" themeColor="textSecondary">
            CANTIDAD EN GRAMOS
          </ThemedText>

          <TextInput
            value={grams}
            onChangeText={setGrams}
            keyboardType="decimal-pad"
            selectTextOnFocus
            style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
          />

          <View style={styles.quick}>
            {food?.servingSizeG ? (
              <Quick
                label={`Racion ${formatNumber(food.servingSizeG, 0)} g`}
                onPress={() => setGrams(String(food.servingSizeG))}
              />
            ) : null}

            {QUICK_GRAMS.map((value) => (
              <Quick key={value} label={`${value} g`} onPress={() => setGrams(String(value))} />
            ))}
          </View>
        </View>

        <View style={[styles.card, { borderColor: theme.border }]}>
          <ThemedText type="small" themeColor="textSecondary">
            COMIDA
          </ThemedText>

          <View style={styles.meals}>
            {MEALS.map((option) => {
              const active = option.value === meal;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => setMeal(option.value)}
                  style={({ pressed }) => [
                    styles.mealChip,
                    { backgroundColor: active ? theme.accent : theme.backgroundElement },
                    pressed && { opacity: 0.6 },
                  ]}>
                  <ThemedText
                    type="small"
                    style={{ color: active ? theme.onAccent : theme.text, fontWeight: '600' }}>
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { borderColor: theme.border }]}>
          <ThemedText type="small" themeColor="textSecondary">
            LO QUE SUMA
          </ThemedText>

          <ThemedText type="subtitle" style={styles.kcal}>
            {formatNumber(kcal, 0)} kcal
          </ThemedText>

          <View style={styles.macros}>
            <Macro label="Proteina" value={per100.proteinPer100g} factor={factor} />
            <Macro label="Carbos" value={per100.carbsPer100g} factor={factor} />
            <Macro label="Grasa" value={per100.fatPer100g} factor={factor} />
          </View>
        </View>

        <Button
          title={editing ? 'Guardar cambios' : 'Anadir al diario'}
          disabled={amount <= 0}
          onPress={() => void save()}
        />
      </ScrollView>
    </View>
  );
}

function Quick({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickChip,
        { backgroundColor: theme.backgroundElement },
        pressed && { opacity: 0.6 },
      ]}>
      <ThemedText type="small">{label}</ThemedText>
    </Pressable>
  );
}

function Macro({ label, value, factor }: { label: string; value: number | null; factor: number }) {
  return (
    <View style={styles.macro}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="default" style={styles.macroValue}>
        {value === null ? '-' : `${formatNumber(value * factor, 1)} g`}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 12, gap: 12, paddingBottom: 48 },
  card: { padding: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: 8 },
  input: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 20,
    fontWeight: '700',
  },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  meals: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mealChip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  kcal: { fontSize: 30, lineHeight: 36 },
  macros: { flexDirection: 'row', gap: 12 },
  macro: { flex: 1, gap: 2 },
  macroValue: { fontWeight: '700' },
});
