import { asc, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo, useState } from 'react';
import { SectionList, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { db } from '@/db/client';
import { exercises, type Exercise } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

/** Strips accents so "biceps" matches "bíceps" and vice versa. */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export default function ExercisesScreen() {
  const theme = useTheme();
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <ThemedText type="title">Ejercicios</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {data.length} en el catalogo
        </ThemedText>
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar por nombre, musculo o material"
        placeholderTextColor={theme.textSecondary}
        autoCorrect={false}
        style={[styles.search, { backgroundColor: theme.backgroundElement, color: theme.text }]}
      />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderSectionHeader={({ section }) => (
          <ThemedText
            type="smallBold"
            themeColor="textSecondary"
            style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
            {section.title.toUpperCase()}
          </ThemedText>
        )}
        renderItem={({ item }) => (
          <View style={[styles.row, { borderBottomColor: theme.backgroundElement }]}>
            <ThemedText type="default">{item.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {item.equipment}
            </ThemedText>
          </View>
        )}
        ListEmptyComponent={
          <ThemedText type="default" themeColor="textSecondary" style={styles.empty}>
            Ningun ejercicio coincide con la busqueda.
          </ThemedText>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, gap: 2 },
  search: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  list: { paddingBottom: 24 },
  sectionHeader: { paddingHorizontal: 16, paddingVertical: 6 },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  empty: { textAlign: 'center', paddingTop: 32 },
});
