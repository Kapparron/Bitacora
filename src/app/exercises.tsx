import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { ExerciseList } from '@/features/exercises/exercise-list';
import { useTheme } from '@/hooks/use-theme';

/**
 * The exercise catalogue. It is reached from Rutinas rather than from a tab of
 * its own: it is a reference to look something up, not a place to work in.
 */
export default function ExercisesScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Ejercicios" />
      <ExerciseList />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
