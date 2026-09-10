import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { db } from '@/db/client';
import { exercises } from '@/db/schema';
import { MEDIA_ATTRIBUTION, exerciseMediaUrl } from '@/features/exercises/media';
import { useTheme } from '@/hooks/use-theme';

export default function ExerciseDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data } = useLiveQuery(db.select().from(exercises).where(eq(exercises.id, id)), [id]);
  const exercise = data.at(0);

  if (!exercise) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ThemedText type="default" themeColor="textSecondary">
          Este ejercicio ya no existe.
        </ThemedText>
      </View>
    );
  }

  // The animation is only fetched when this screen opens; expo-image keeps it on
  // disk afterwards, so a second visit works offline.
  const animation = exerciseMediaUrl(exercise.gifPath);
  const steps = exercise.steps ?? [];

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: exercise.name }} />

      {animation ? (
        <View style={styles.mediaBlock}>
          <Image
            source={animation}
            style={[styles.media, { backgroundColor: theme.backgroundElement }]}
            contentFit="contain"
            transition={150}
          />
          <ThemedText type="small" themeColor="textSecondary" style={styles.attribution}>
            {MEDIA_ATTRIBUTION}
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.header}>
        <ThemedText type="default" style={styles.title}>
          {exercise.name}
        </ThemedText>

        {exercise.nameEn && exercise.nameEn !== exercise.name ? (
          <ThemedText type="small" themeColor="textSecondary">
            {exercise.nameEn}
          </ThemedText>
        ) : null}

        <View style={styles.tags}>
          <Tag label={exercise.muscleGroup} />
          <Tag label={exercise.equipment} />
        </View>
      </View>

      {steps.length > 0 ? (
        <View style={styles.steps}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            COMO SE HACE
          </ThemedText>

          {steps.map((step, index) => (
            <View key={index} style={styles.step}>
              <ThemedText type="smallBold" style={[styles.stepNumber, { color: theme.accent }]}>
                {index + 1}
              </ThemedText>
              <ThemedText type="default" style={styles.stepText}>
                {step}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function Tag({ label }: { label: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.tag, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="small">{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { paddingBottom: 48 },
  mediaBlock: { alignItems: 'center', paddingTop: 12, gap: 6 },
  media: { width: 240, height: 240, borderRadius: 16 },
  attribution: { fontSize: 11 },
  header: { paddingHorizontal: 16, paddingTop: 16, gap: 6 },
  title: { fontWeight: '700', fontSize: 20 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4 },
  tag: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  steps: { paddingHorizontal: 16, paddingTop: 24, gap: 10 },
  step: { flexDirection: 'row', gap: 10 },
  stepNumber: { width: 18, textAlign: 'center' },
  stepText: { flex: 1 },
});
