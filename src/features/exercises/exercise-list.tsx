import Ionicons from '@expo/vector-icons/Ionicons';
import { asc, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { db } from '@/db/client';
import { exercises, type Exercise } from '@/db/schema';
import { exerciseMediaUrl } from '@/features/exercises/media';
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
  const [query, setQuery] = useState('');
  /** Muscle group filter; null means every group. */
  const [group, setGroup] = useState<string | null>(null);

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

  /** Muscle groups present in the catalogue, most populated first. */
  const groups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const exercise of data) {
      counts.set(exercise.muscleGroup, (counts.get(exercise.muscleGroup) ?? 0) + 1);
    }

    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [data]);

  const sections = useMemo(() => {
    const needle = normalizeText(query.trim());
    let matches = needle
      ? searchIndex.filter((entry) => entry.haystack.includes(needle)).map((entry) => entry.exercise)
      : data;

    if (group) matches = matches.filter((exercise) => exercise.muscleGroup === group);

    const byGroup = new Map<string, Exercise[]>();
    for (const exercise of matches) {
      const current = byGroup.get(exercise.muscleGroup);
      if (current) current.push(exercise);
      else byGroup.set(exercise.muscleGroup, [exercise]);
    }

    return [...byGroup.entries()].map(([title, items]) => ({ title, data: items }));
  }, [data, searchIndex, query, group]);

  const selectable = selectedIds !== undefined;

  const handlePress = useCallback(
    (exercise: Exercise) => {
      if (selectable) onToggle?.(exercise);
      else router.push(`/exercise/${exercise.id}`);
    },
    [selectable, onToggle, router]
  );

  const renderItem = useCallback(
    ({ item }: { item: Exercise }) => (
      <ExerciseRow
        exercise={item}
        selected={selectedIds?.has(item.id) ?? false}
        selectable={selectable}
        onPress={handlePress}
      />
    ),
    [selectedIds, selectable, handlePress]
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.chips}>
            {groups.map((name) => {
              const active = name === group;

              return (
                <Pressable
                  key={name}
                  // Tapping the active chip clears the filter.
                  onPress={() => setGroup(active ? null : name)}
                  style={({ pressed }) => [
                    styles.chip,
                    { backgroundColor: active ? theme.accent : theme.backgroundElement },
                    pressed && { opacity: 0.6 },
                  ]}>
                  <ThemedText
                    type="small"
                    style={{ color: active ? theme.onAccent : theme.text, fontWeight: '600' }}>
                    {name}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.count}>
            {group
              ? `${sections[0]?.data.length ?? 0} en ${group}`
              : `${data.length} ejercicios en el catalogo`}
          </ThemedText>
        </View>
      }
      renderSectionHeader={({ section }) =>
        // With a group selected there is only one section, and its chip already
        // names it.
        group ? null : (
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

function keyExtractor(item: Exercise): string {
  return item.id;
}

const ExerciseRow = memo(function ExerciseRow({
  exercise,
  selected,
  selectable,
  onPress,
}: {
  exercise: Exercise;
  selected: boolean;
  selectable: boolean;
  onPress: (exercise: Exercise) => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => onPress(exercise)}
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
  chips: { gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
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
