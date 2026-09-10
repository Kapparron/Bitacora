import { Stack } from 'expo-router';

export default function ExerciseLayout() {
  return (
    <Stack>
      <Stack.Screen name="[id]" options={{ title: 'Ejercicio' }} />
    </Stack>
  );
}
