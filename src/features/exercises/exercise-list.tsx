import Ionicons from '@expo/vector-icons/Ionicons';
import { asc, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, TextInput, View } from 'react-native';

import { useConfirm } from '@/components/confirm-dialog';
import { OptionSheet, type SheetOption } from '@/components/option-sheet';
import { ThemedText } from '@/components/themed-text';
import { db } from '@/db/client';
import { exercises, type Exercise } from '@/db/schema';
import {
  filterCounts,
  matchesFilters,
  type ExerciseFilters,
} from '@/features/exercises/filters';
import { exerciseMediaUrl } from '@/features/exercises/media';
import { deleteCustomExercise } from '@/features/exercises/mutations';
import { useTheme } from '@/hooks/use-theme';
import { normalizeText } from '@/lib/text';

/** Fixed so the list can skip measuring 1.324 rows while scrolling. */
const ROW_HEIGHT = 69;

export type ExerciseListProps = {
  /** When set, rows show a checkbox and report taps instead of being inert. */
  selectedIds?: ReadonlySet<string>;
  onToggle?: (exercise: Exercise) => void;
  /** Rendered above the search box. */
  header?: React.ReactNode;
};

/**
 * The catalogue, grouped by muscle and searchable. Shared by the Ejercicios tab
 * and the picker inside a session so both always show the same list.
 *
 * The catalogue has over a thousand rows, so the row is memoised and every prop
 * it receives is stable across renders. Otherwise ticking one checkbox
 * re-renders every mounted row and reloads its thumbnail.
 */
export function ExerciseList({ selectedIds, onToggle, header }: ExerciseListProps) {
  const theme = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<ExerciseFilters>({ muscleGroup: null, equipment: null });
  /** Which filter sheet is open, if any. */
  const [openFilter, setOpenFilter] = useState<keyof ExerciseFilters | null>(null);

  const { data } = useLiveQuery(
    db
      .select()
      .from(exercises)
      .where(isNull(exercises.deletedAt))
      .orderBy(asc(exercises.muscleGroup), asc(exercises.name))
  );

  // Normalising four fields of 1.324 rows on every keystroke was the other half
  // of the lag, so the searchable text is built once per catalogue change.
  // The English name is included because the catalogue is English upstream.
  const searchIndex = useMemo(
    () =>
      data.map((exercise) => ({
        exercise,
        haystack: normalizeText(
          `${exercise.name} ${exercise.nameEn ?? ''} ${exercise.muscleGroup} ${exercise.equipment}`
        ),
      })),
    [data]
  );

  /** Exercises matching the search text, before the muscle and equipment filters. */
  const textMatches = useMemo(() => {
    const needle = normalizeText(query.trim());

    return needle
      ? searchIndex.filter((entry) => entry.haystack.includes(needle)).map((entry) => entry.exercise)
      : data;
  }, [data, searchIndex, query]);

  const matches = useMemo(
    () => textMatches.filter((exercise) => matchesFilters(exercise, filters)),
    [textMatches, filters]
  );

  const sections = useMemo(() => {
    const byGroup = new Map<string, Exercise[]>();
    for (const exercise of matches) {
      const current = byGroup.get(exercise.muscleGroup);
      if (current) current.push(exercise);
      else byGroup.set(exercise.muscleGroup, [exercise]);
    }

    return [...byGroup.entries()].map(([title, items]) => ({ title, data: items }));
  }, [matches]);

  // Built only while a sheet is open, so typing does not recount the catalogue.
  const sheetOptions = useMemo((): SheetOption<string | null>[] => {
    if (!openFilter) return [];

    const counts = filterCounts(textMatches, openFilter, filters);
    const total = counts.reduce((sum, [, count]) => sum + count, 0);

    return [
      { value: null, label: FILTER_LABELS[openFilter].all, description: `${total} ejercicios` },
      ...counts.map(([name, count]) => ({
        value: name,
        label: name,
        description: `${count} ejercicios`,
      })),
    ];
  }, [openFilter, textMatches, filters]);

  const selectable = selectedIds !== undefined;

  const handlePress = useCallback(
    (exercise: Exercise) => {
      if (selectable) onToggle?.(exercise);
      else router.push(`/exercise/${exercise.id}`);
    },
    [selectable, onToggle, router]
  );

  /**
   * Long press removes an exercise the user added. Catalogue exercises are not
   * offered: they come back with the next seed, so hiding one would not stick.
   */
  const handleLongPress = useCallback(
    async (exercise: Exercise) => {
      if (!exercise.isCustom) return;

      const accepted = await confirm({
        title: 'Borrar ejercicio',
        message: `Se borra "${exercise.name}". Los entrenos que ya lo usan lo siguen mostrando.`,
        confirmLabel: 'Borrar',
      });

      if (accepted) await deleteCustomExercise(exercise.id);
    },
    [confirm]
  );

  const renderItem = useCallback(
    ({ item }: { item: Exercise }) => (
      <ExerciseRow
        exercise={item}
        selected={selectedIds?.has(item.id) ?? false}
        selectable={selectable}
        onPress={handlePress}
        onLongPress={handleLongPress}
      />
    ),
    [selectedIds, selectable, handlePress, handleLongPress]
  );

  return (
    <SectionList
      sections={sections}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      stickySectionHeadersEnabled={false}
      initialNumToRender={12}
      maxToRenderPerBatch={8}
      windowSize={5}
      removeClippedSubviews
      ListHeaderComponent={
        <View>
          {header}
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por nombre, musculo o material"
            placeholderTextColor={theme.textSecondary}
            autoCorrect={false}
            style={[styles.search, { backgroundColor: theme.backgroundElement, color: theme.text }]}
          />
          <View style={styles.filters}>
            {FILTER_FIELDS.map((field) => {
              const value = filters[field];

              return (
                <Pressable
                  key={field}
                  onPress={() => setOpenFilter(field)}
                  style={({ pressed }) => [
                    styles.filter,
                    { backgroundColor: value ? theme.accent : theme.backgroundElement },
                    pressed && { opacity: 0.6 },
                  ]}>
                  <ThemedText
                    type="small"
                    numberOfLines={1}
                    style={[styles.filterText, { color: value ? theme.onAccent : theme.text }]}>
                    {value ?? FILTER_LABELS[field].all}
                  </ThemedText>
                  {value ? (
                    // Clears the filter in one tap, without opening the sheet.
                    <Pressable
                      hitSlop={10}
                      accessibilityLabel={FILTER_LABELS[field].all}
                      onPress={() => setFilters((current) => ({ ...current, [field]: null }))}>
                      <Ionicons name="close-circle" size={18} color={theme.onAccent} />
                    </Pressable>
                  ) : (
                    <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
                  )}
                </Pressable>
              );
            })}
          </View>

          <ThemedText type="small" themeColor="textSecondary" style={styles.count}>
            {matches.length === data.length
              ? `${data.length} ejercicios en el catalogo`
              : `${matches.length} de ${data.length} ejercicios`}
          </ThemedText>

          {openFilter ? (
            <OptionSheet
              title={FILTER_LABELS[openFilter].title}
              options={sheetOptions}
              current={filters[openFilter]}
              onSelect={(value) => {
                setFilters((current) => ({ ...current, [openFilter]: value }));
                setOpenFilter(null);
              }}
              onClose={() => setOpenFilter(null)}
            />
          ) : null}
        </View>
      }
      renderSectionHeader={({ section }) =>
        // With a group selected there is only one section, and its filter button
        // already names it.
        filters.muscleGroup ? null : (
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
            {section.title.toUpperCase()}
          </ThemedText>
        )
      }
      ListEmptyComponent={
        <ThemedText type="default" themeColor="textSecondary" style={styles.empty}>
          Ningun ejercicio coincide con la busqueda.
        </ThemedText>
      }
    />
  );
}

const FILTER_FIELDS: (keyof ExerciseFilters)[] = ['muscleGroup', 'equipment'];

const FILTER_LABELS: Record<keyof ExerciseFilters, { title: string; all: string }> = {
  muscleGroup: { title: 'Musculo', all: 'Todos los musculos' },
  equipment: { title: 'Material', all: 'Todo el material' },
};

function keyExtractor(item: Exercise): string {
  return item.id;
}

const ExerciseRow = memo(function ExerciseRow({
  exercise,
  selected,
  selectable,
  onPress,
  onLongPress,
}: {
  exercise: Exercise;
  selected: boolean;
  selectable: boolean;
  onPress: (exercise: Exercise) => void;
  onLongPress: (exercise: Exercise) => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => onPress(exercise)}
      onLongPress={() => void onLongPress(exercise)}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.backgroundElement },
        pressed && { backgroundColor: theme.backgroundElement },
      ]}>
      <Image
        source={exerciseMediaUrl(exercise.imagePath)}
        // Lets expo-image reuse the view when the list recycles this row.
        recyclingKey={exercise.id}
        cachePolicy="memory-disk"
        priority="low"
        style={[styles.thumbnail, { backgroundColor: theme.backgroundElement }]}
        contentFit="cover"
        transition={0}
      />

      <View style={styles.rowText}>
        <ThemedText type="default" numberOfLines={1}>
          {exercise.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {exercise.equipment}
        </ThemedText>
      </View>

      {selectable ? (
        <Ionicons
          name={selected ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={selected ? theme.accentText : theme.textSecondary}
        />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  list: { paddingBottom: 24 },
  search: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  filter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterText: { flex: 1, fontWeight: '600' },
  count: { paddingHorizontal: 16, paddingTop: 10 },
  sectionHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumbnail: { width: 44, height: 44, borderRadius: 8 },
  rowText: { flex: 1, gap: 2 },
  empty: { textAlign: 'center', paddingTop: 32 },
});
