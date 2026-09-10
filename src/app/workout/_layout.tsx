import { Stack } from 'expo-router';

/** Headers are drawn in-screen with ScreenHeader; the navigator's bar is off. */
export default function WorkoutLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
