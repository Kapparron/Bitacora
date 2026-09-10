import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { useConfirm } from '@/components/confirm-dialog';
import { TextPrompt } from '@/components/text-prompt';
import { ThemedText } from '@/components/themed-text';
import {
  createFolder,
  createRoutine,
  deleteFolder,
  deleteRoutine,
} from '@/features/routines/mutations';
import { useRoutineFolders, useRoutines, type RoutineSummary } from '@/features/routines/queries';
import { startWorkoutFromRoutine } from '@/features/workout/mutations';
import { useActiveWorkout } from '@/features/workout/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatDay } from '@/lib/format';

const ROOT_SECTION = 'Sin carpeta';

export default function RoutinesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const { routines } = useRoutines();
  const folders = useRoutineFolders();
  const { contents: active } = useActiveWorkout();

  const [prompt, setPrompt] = useState<'routine' | 'folder' | null>(null);

  const sections = useMemo(() => {
    const byFolder = new Map<string, RoutineSummary[]>();
    for (const routine of routines) {
      const key = routine.folderId ?? '';
      const current = byFolder.get(key);
      if (current) current.push(routine);
      else byFolder.set(key, [routine]);
    }

    // Folders come first in their own order; loose routines close the list.
    const foldered = folders.map((folder) => ({
      title: folder.name,
      folderId: folder.id,
      data: byFolder.get(folder.id) ?? [],
    }));

    return [
      ...foldered,
      { title: ROOT_SECTION, folderId: null, data: byFolder.get('') ?? [] },
    ].filter((section) => section.data.length > 0 || section.folderId !== null);
  }, [routines, folders]);

  async function start(routine: RoutineSummary) {
    if (active) {
      const accepted = await confirm({
        title: 'Ya hay un entreno en curso',
        message: 'Termina o descarta el entreno actual antes de empezar esta rutina.',
        confirmLabel: 'Ir al entreno',
      });

      if (accepted) router.navigate('/workout/active');
      return;
    }

    await startWorkoutFromRoutine(routine.id);
    router.navigate('/workout/active');
  }

  async function removeFolder(folderId: string, name: string) {
    const accepted = await confirm({
      title: 'Borrar carpeta',
      message: `Se borra "${name}". Sus rutinas se quedan, fuera de la carpeta.`,
      confirmLabel: 'Borrar',
      destructive: true,
    });

    if (accepted) await deleteFolder(folderId);
  }

  async function removeRoutine(routine: RoutineSummary) {
    const accepted = await confirm({
      title: 'Borrar rutina',
      message: `Se borra "${routine.name}". Los entrenos ya registrados con ella se mantienen.`,
      confirmLabel: 'Borrar',
      destructive: true,
    });

    if (accepted) await deleteRoutine(routine.id);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <ThemedText type="subtitle">Rutinas</ThemedText>
            <View style={styles.headerActions}>
              <Button
                title="Nueva rutina"
                style={styles.headerButton}
                onPress={() => setPrompt('routine')}
              />
              <Button
                title="Nueva carpeta"
                variant="secondary"
                style={styles.headerButton}
                onPress={() => setPrompt('folder')}
              />
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {section.title.toUpperCase()}
            </ThemedText>

            {section.folderId ? (
              <Pressable
                onPress={() => void removeFolder(section.folderId!, section.title)}
                hitSlop={8}>
                <Ionicons name="trash-outline" size={16} color={theme.textSecondary} />
              </Pressable>
            ) : null}
          </View>
        )}
        renderSectionFooter={({ section }) =>
          section.data.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyFolder}>
              Carpeta vacia
            </ThemedText>
          ) : null
        }
        renderItem={({ item }) => (
          <RoutineRow
            routine={item}
            onOpen={() => router.push(`/routine/${item.id}`)}
            onStart={() => void start(item)}
            onDelete={() => void removeRoutine(item)}
          />
        )}
        ListEmptyComponent={
          <ThemedText type="default" themeColor="textSecondary" style={styles.empty}>
            Todavia no hay rutinas. Crea una para no tener que montar el entreno cada vez.
          </ThemedText>
        }
      />

      {prompt ? (
        <TextPrompt
          title={prompt === 'routine' ? 'Nueva rutina' : 'Nueva carpeta'}
          placeholder={prompt === 'routine' ? 'Torso, Pierna, Empuje...' : 'Nombre de la carpeta'}
          confirmLabel="Crear"
          onCancel={() => setPrompt(null)}
          onSubmit={async (name) => {
            const kind = prompt;
            setPrompt(null);

            if (kind === 'folder') {
              await createFolder(name);
              return;
            }

            const id = await createRoutine(name);
            router.push(`/routine/${id}`);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

function RoutineRow({
  routine,
  onOpen,
  onStart,
  onDelete,
}: {
  routine: RoutineSummary;
  onOpen: () => void;
  onStart: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onOpen}
      onLongPress={onDelete}
      style={({ pressed }) => [
        styles.row,
        { borderColor: theme.border },
        pressed && { backgroundColor: theme.backgroundElement },
      ]}>
      <View style={styles.rowText}>
        <ThemedText type="default" style={styles.rowTitle}>
          {routine.name}
        </ThemedText>

        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {routine.exerciseCount === 0
            ? 'Sin ejercicios todavia'
            : (routine.preview ?? `${routine.exerciseCount} ejercicios`)}
        </ThemedText>

        {routine.lastPerformedAt ? (
          <ThemedText type="small" themeColor="textSecondary">
            Ultima vez: {formatDay(routine.lastPerformedAt)}
          </ThemedText>
        ) : null}
      </View>

      <Pressable
        onPress={onStart}
        disabled={routine.exerciseCount === 0}
        hitSlop={8}
        style={({ pressed }) => [
          styles.play,
          { backgroundColor: theme.accent },
          (pressed || routine.exerciseCount === 0) && { opacity: 0.4 },
        ]}>
        <Ionicons name="play" size={18} color={theme.onAccent} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingBottom: 120 },
  header: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerButton: { flex: 1, paddingVertical: 12 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontWeight: '700' },
  play: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  emptyFolder: { paddingHorizontal: 16, paddingBottom: 8 },
  empty: { textAlign: 'center', paddingHorizontal: 32, paddingTop: 24 },
});
