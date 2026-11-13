import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { useConfirm } from '@/components/confirm-dialog';
import { ScreenHeader } from '@/components/screen-header';
import { TextPrompt } from '@/components/text-prompt';
import { ThemedText } from '@/components/themed-text';
import { cleanMealName, type MealInfo } from '@/features/nutrition/meals';
import {
  createMeal,
  removeMeal,
  renameMeal,
  reorderMeals,
  setMealHidden,
} from '@/features/nutrition/mutations';
import { useMeals } from '@/features/nutrition/queries';
import { useTheme } from '@/hooks/use-theme';

/**
 * The meals a day is split into: add, rename, reorder, hide and delete. The four
 * the app started with are ordinary rows here, nothing about them is special.
 */
export default function MealsScreen() {
  const theme = useTheme();
  const confirm = useConfirm();
  const meals = useMeals();

  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState<MealInfo | null>(null);

  function move(index: number, by: -1 | 1) {
    const ids = meals.map((meal) => meal.id);
    const target = index + by;
    if (target < 0 || target >= ids.length) return;

    [ids[index], ids[target]] = [ids[target], ids[index]];
    void reorderMeals(ids);
  }

  async function remove(meal: MealInfo) {
    const accepted = await confirm({
      title: 'Quitar comida',
      message: `Se quita "${meal.name}". Si ya tiene alimentos apuntados, solo se oculta y sus dias siguen mostrandola.`,
      confirmLabel: 'Quitar',
    });

    if (accepted) await removeMeal(meal.id);
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Comidas" subtitle="Las que salen en el diario" />

      <ScrollView contentContainerStyle={styles.content}>
        {meals.map((meal, index) => (
          <View key={meal.id} style={[styles.row, { borderColor: theme.border }]}>
            <ThemedText
              type="default"
              style={[styles.name, meal.hidden && { opacity: 0.45 }]}
              numberOfLines={1}>
              {meal.name}
              {meal.hidden ? ' (oculta)' : ''}
            </ThemedText>

            <Pressable
              onPress={() => move(index, -1)}
              disabled={index === 0}
              hitSlop={8}
              accessibilityLabel={`Subir ${meal.name}`}>
              <Ionicons
                name="chevron-up"
                size={22}
                color={theme.textSecondary}
                style={index === 0 && { opacity: 0.25 }}
              />
            </Pressable>
            <Pressable
              onPress={() => move(index, 1)}
              disabled={index === meals.length - 1}
              hitSlop={8}
              accessibilityLabel={`Bajar ${meal.name}`}>
              <Ionicons
                name="chevron-down"
                size={22}
                color={theme.textSecondary}
                style={index === meals.length - 1 && { opacity: 0.25 }}
              />
            </Pressable>
            <Pressable
              onPress={() => setRenaming(meal)}
              hitSlop={8}
              accessibilityLabel={`Renombrar ${meal.name}`}>
              <Ionicons name="create-outline" size={20} color={theme.textSecondary} />
            </Pressable>
            <Pressable
              onPress={() => void setMealHidden(meal.id, !meal.hidden)}
              hitSlop={8}
              accessibilityLabel={meal.hidden ? `Mostrar ${meal.name}` : `Ocultar ${meal.name}`}>
              <Ionicons
                name={meal.hidden ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={theme.textSecondary}
              />
            </Pressable>
            <Pressable
              onPress={() => void remove(meal)}
              hitSlop={8}
              accessibilityLabel={`Quitar ${meal.name}`}>
              <Ionicons name="trash-outline" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>
        ))}

        <Button title="Anadir comida" variant="secondary" onPress={() => setAdding(true)} />
      </ScrollView>

      {adding ? (
        <TextPrompt
          title="Nueva comida"
          placeholder="Merienda"
          confirmLabel="Anadir"
          onCancel={() => setAdding(false)}
          onSubmit={(name) => {
            const clean = cleanMealName(name, meals);
            setAdding(false);
            if (clean) void createMeal(clean);
          }}
        />
      ) : null}

      {renaming ? (
        <TextPrompt
          title="Renombrar comida"
          initialValue={renaming.name}
          confirmLabel="Guardar"
          onCancel={() => setRenaming(null)}
          onSubmit={(name) => {
            const target = renaming;
            setRenaming(null);
            const clean = cleanMealName(
              name,
              meals.filter((meal) => meal.id !== target.id)
            );
            if (clean) void renameMeal(target.id, clean);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 12, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  name: { flex: 1, fontWeight: '600' },
});
