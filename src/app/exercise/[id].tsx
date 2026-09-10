import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { db } from '@/db/client';
import { exercises, personalRecords } from '@/db/schema';
import { MEDIA_ATTRIBUTION, exerciseMediaUrl } from '@/features/exercises/media';
import { RECORD_LABEL } from '@/features/workout/records';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatNumber, formatWeight } from '@/lib/format';

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
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScreenHeader title={exercise.name} />

      <ScrollView contentContainerStyle={styles.content}>

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

      <ExerciseRecords exerciseId={exercise.id} />

      {steps.length > 0 ? (
        <View style={styles.steps}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            COMO SE HACE
          </ThemedText>

          {steps.map((step, index) => (
            <View key={index} style={styles.step}>
              <ThemedText type="smallBold" style={[styles.stepNumber, { color: theme.accentText }]}>
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
    </View>
  );
}

/** Best marks for this exercise, written when a session is finished. */
function ExerciseRecords({ exerciseId }: { exerciseId: string }) {
  const { data } = useLiveQuery(
    db.select().from(personalRecords).where(eq(personalRecords.exerciseId, exerciseId)),
    [exerciseId]
  );

  if (data.length === 0) return null;

  return (
    <View style={styles.records}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        RECORDS
      </ThemedText>

      {data.map((record) => (
        <View key={record.id} style={styles.record}>
          <ThemedText type="default" style={styles.recordLabel}>
            {RECORD_LABEL[record.type]}
          </ThemedText>
          <ThemedText type="default" style={styles.recordValue}>
            {record.type === 'heaviest_weight' || record.type === 'estimated_1rm'
              ? formatWeight(record.value)
              : `${formatNumber(record.value, 0)} kg`}
          </ThemedText>
        </View>
      ))}

      <ThemedText type="small" themeColor="textSecondary">
        Ultimo el {formatDay(Math.max(...data.map((record) => record.achievedAt)))}
      </ThemedText>
    </View>
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
  screen: { flex: 1 },
  content: { paddingBottom: 48 },
  mediaBlock: { alignItems: 'center', paddingTop: 12, gap: 6 },
  media: { width: 240, height: 240, borderRadius: 16 },
  attribution: { fontSize: 11 },
  header: { paddingHorizontal: 16, paddingTop: 16, gap: 6 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4 },
  tag: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  records: { paddingHorizontal: 16, paddingTop: 24, gap: 6 },
  record: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  recordLabel: { flex: 1 },
  recordValue: { fontWeight: '700' },
  steps: { paddingHorizontal: 16, paddingTop: 24, gap: 10 },
  step: { flexDirection: 'row', gap: 10 },
  stepNumber: { width: 18, textAlign: 'center' },
  stepText: { flex: 1 },
});
