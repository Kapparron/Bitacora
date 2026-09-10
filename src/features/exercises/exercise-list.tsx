import Ionicons from '@expo/vector-icons/Ionicons';
import { asc, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { db } from '@/db/client';
import { exercises, type Exercise } from '@/db/schema';
import { exerciseMediaUrl } from '@/features/exercises/media';
import { useTheme } from '@/hooks/use-theme';

/** Strips accents so "biceps" matches "bíceps" and vice versa. */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

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
 */
export function ExerciseList({ selectedIds, onToggle, header }: ExerciseListProps) {
  const theme = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState('');

  const { data } = useLiveQuery(
    db
      .select()
      .from(exercises)
      .where(isNull(exercises.deletedAt))
      .orderBy(asc(exercises.muscleGroup), asc(exercises.name))
  );

  const sections = useMemo(() => {
    const needle = normalize(query.trim());
    const matches = needle
      ? data.filter(
          (exercise) =>
            normalize(exercise.name).includes(needle) ||
            // The catalogue is English upstream, so both names are searchable.
            normalize(exercise.nameEn ?? '').includes(needle) ||
            normalize(exercise.muscleGroup).includes(needle) ||
            normalize(exercise.equipment).includes(needle)
        )
      : data;

    const byGroup = new Map<string, Exercise[]>();
    for (const exercise of matches) {
      const group = byGroup.get(exercise.muscleGroup);
      if (group) group.push(exercise);
      else byGroup.set(exercise.muscleGroup, [exercise]);
    }

    return [...byGroup.entries()].map(([title, items]) => ({ title, data: items }));
  }, [data, query]);

  const selectable = selectedIds !== undefined;

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      stickySectionHeadersEnabled={false}
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
          <ThemedText type="small" themeColor="textSecondary" style={styles.count}>
            {data.length} ejercicios en el catalogo
          </ThemedText>
        </View>
      }
      renderSectionHeader={({ section }) => (
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
          {section.title.toUpperCase()}
        </ThemedText>
      )}
      renderItem={({ item }) => {
        const selected = selectedIds?.has(item.id) ?? false;
        const thumbnail = exerciseMediaUrl(item.imagePath);

        return (
          <Pressable
            onPress={
              selectable ? () => onToggle?.(item) : () => router.push(`/exercise/${item.id}`)
            }
            style={({ pressed }) => [
              styles.row,
              { borderBottomColor: theme.backgroundElement },
              pressed && { backgroundColor: theme.backgroundElement },
            ]}>
            <Image
              source={thumbnail}
              style={[styles.thumbnail, { backgroundColor: theme.backgroundElement }]}
              contentFit="cover"
              transition={120}
            />

            <View style={styles.rowText}>
              <ThemedText type="default">{item.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.equipment}
              </ThemedText>
            </View>

            {selectable ? (
              <Ionicons
                name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={selected ? theme.accent : theme.textSecondary}
              />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            )}
          </Pressable>
        );
      }}
      ListEmptyComponent={
        <ThemedText type="default" themeColor="textSecondary" style={styles.empty}>
          Ningun ejercicio coincide con la busqueda.
        </ThemedText>
      }
    />
  );
}

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
  count: { paddingHorizontal: 16, paddingTop: 6 },
  sectionHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumbnail: { width: 44, height: 44, borderRadius: 8 },
  rowText: { flex: 1, gap: 2 },
  empty: { textAlign: 'center', paddingTop: 32 },
});
