import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import type { Exercise } from '@/db/schema';
import { exerciseMediaUrl } from '@/features/exercises/media';
import { useTheme } from '@/hooks/use-theme';

/**
 * The small still of an exercise, wherever it is listed. Tapping it opens the
 * exercise, so the animation and the instructions are one tap away from a
 * session, a logged session or a routine.
 *
 * Memoised because it is rendered once per exercise in lists that re-render on
 * every set edit.
 */
export const ExerciseThumbnail = memo(function ExerciseThumbnail({
  exercise,
  size = 44,
}: {
  /** Only the fields the still needs, so a list query can select just those. */
  exercise: Pick<Exercise, 'id' | 'name' | 'imagePath'>;
  size?: number;
}) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: exercise.id } })}
      accessibilityLabel={`Ver ${exercise.name}`}
      style={({ pressed }) => pressed && styles.pressed}>
      <Image
        source={exerciseMediaUrl(exercise.imagePath)}
        recyclingKey={exercise.id}
        cachePolicy="memory-disk"
        style={[
          styles.thumbnail,
          { width: size, height: size, backgroundColor: theme.backgroundElement },
        ]}
        contentFit="cover"
        transition={120}
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  thumbnail: { width: 44, height: 44, borderRadius: 8 },
  pressed: { opacity: 0.6 },
});
