import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useConfirm } from '@/components/confirm-dialog';
import { OptionSheet, type SheetOption } from '@/components/option-sheet';
import { ThemedText } from '@/components/themed-text';
import { DayPrompt } from '@/features/calendar/date-prompt';
import { MacroSummary } from '@/features/nutrition/components/macro-summary';
import { deleteEntry } from '@/features/nutrition/mutations';
import { MEALS, useDayDiary, useGoalFor, type Meal } from '@/features/nutrition/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatNumber, shiftIsoDay, toIsoDay } from '@/lib/format';
import type { FoodEntry } from '@/db/schema';

export default function NutritionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const [date, setDate] = useState(() => toIsoDay());
  /** Entry whose long-press menu is open. */
  const [menuEntry, setMenuEntry] = useState<FoodEntry | null>(null);
  const [pickingDay, setPickingDay] = useState(false);

  const { diary } = useDayDiary(date);
  const goal = useGoalFor(date);

  async function remove(entry: FoodEntry) {
    const accepted = await confirm({
      title: 'Borrar registro',
      message: `Se borra ${entry.name}.`,
      confirmLabel: 'Borrar',
      destructive: true,
    });

    if (accepted) await deleteEntry(entry.id);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.dayBar}>
        <Pressable onPress={() => setDate(shiftIsoDay(date, -1))} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>

        <Pressable onPress={() => setPickingDay(true)} style={styles.dayLabel}>
          <ThemedText type="default" style={styles.dayText}>
            {formatDay(new Date(`${date}T12:00:00`).getTime())}
          </ThemedText>
        </Pressable>

        <Pressable onPress={() => setDate(shiftIsoDay(date, 1))} hitSlop={10}>
          <Ionicons name="chevron-forward" size={22} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <MacroSummary totals={diary.totals} goal={goal} />

        {MEALS.map(({ value, label }) => (
          <MealSection
            key={value}
            label={label}
            entries={diary.byMeal[value]}
            kcal={diary.mealTotals[value].kcal}
            onAdd={() =>
              router.push({ pathname: '/food/search', params: { date, meal: value } })
            }
            onLongPressEntry={setMenuEntry}
          />
        ))}
      </ScrollView>

      {pickingDay ? (
        <DayPrompt
          title="Ir a un dia"
          initialDay={date}
          confirmLabel="Ver"
          onCancel={() => setPickingDay(false)}
          onSubmit={(day) => {
            setPickingDay(false);
            setDate(day);
          }}
        />
      ) : null}

      {menuEntry ? (
        <OptionSheet
          title={menuEntry.name}
          options={ENTRY_ACTIONS}
          current={null}
          onSelect={(action) => {
            const entry = menuEntry;
            setMenuEntry(null);
            if (!entry) return;

            if (action === 'edit') {
              router.push({
                pathname: '/food/amount',
                params: { entryId: entry.id, date: entry.date, meal: entry.meal },
              });
            } else {
              void remove(entry);
            }
          }}
          onClose={() => setMenuEntry(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const ENTRY_ACTIONS: SheetOption<'edit' | 'delete'>[] = [
  { value: 'edit', label: 'Editar', description: 'Cambiar la cantidad o la comida' },
  { value: 'delete', label: 'Eliminar', description: 'Quitar del diario' },
];

function MealSection({
  label,
  entries,
  kcal,
  onAdd,
  onLongPressEntry,
}: {
  label: string;
  entries: FoodEntry[];
  kcal: number;
  onAdd: () => void;
  onLongPressEntry: (entry: FoodEntry) => void;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.meal, { borderColor: theme.border }]}>
      <View style={styles.mealHeader}>
        <ThemedText type="default" style={styles.mealTitle}>
          {label}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatNumber(kcal, 0)} kcal
        </ThemedText>
      </View>

      {entries.map((entry) => (
        <Pressable
          key={entry.id}
          onLongPress={() => onLongPressEntry(entry)}
          style={({ pressed }) => [
            styles.entry,
            { borderTopColor: theme.border },
            pressed && { backgroundColor: theme.backgroundElement },
          ]}>
          <View style={styles.entryText}>
            <ThemedText type="default" numberOfLines={1}>
              {entry.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {formatNumber(entry.grams, 0)} g
              {entry.brand ? ` · ${entry.brand}` : ''}
              {entry.protein !== null ? ` · P ${formatNumber(entry.protein, 0)}` : ''}
              {entry.carbs !== null ? ` C ${formatNumber(entry.carbs, 0)}` : ''}
              {entry.fat !== null ? ` G ${formatNumber(entry.fat, 0)}` : ''}
            </ThemedText>
          </View>

          <ThemedText type="default" style={styles.entryKcal}>
            {formatNumber(entry.kcal, 0)}
          </ThemedText>
        </Pressable>
      ))}

      <Pressable
        onPress={onAdd}
        style={({ pressed }) => [
          styles.add,
          { borderTopColor: theme.border },
          pressed && { backgroundColor: theme.backgroundElement },
        ]}>
        <Ionicons name="add" size={18} color={theme.accentText} />
        <ThemedText type="small" style={{ color: theme.accentText, fontWeight: '700' }}>
          Anadir alimento
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  dayBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  dayLabel: { flex: 1, alignItems: 'center' },
  dayText: { fontWeight: '700' },
  content: { paddingBottom: 120, gap: 12 },
  meal: {
    marginHorizontal: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  mealTitle: { fontWeight: '700' },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  entryText: { flex: 1, gap: 2 },
  entryKcal: { fontWeight: '700' },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
