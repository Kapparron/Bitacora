import { Stack } from 'expo-router';

export default function RoutineLayout() {
  return (
    <Stack>
      <Stack.Screen name="[id]" options={{ title: 'Rutina' }} />
    </Stack>
  );
}
