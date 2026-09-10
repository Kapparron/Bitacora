import { Stack } from 'expo-router';

export default function WorkoutLayout() {
  return (
    <Stack>
      <Stack.Screen name="active" options={{ title: 'Entreno en curso' }} />
      <Stack.Screen name="[id]" options={{ title: 'Entreno' }} />
    </Stack>
  );
}
