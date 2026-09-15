import { requireOptionalNativeModule } from 'expo';

type WorkoutNotificationsModule = {
  requestPermissionAsync(): Promise<boolean>;
  showWorkout(title: string, text: string, startedAt: number, url: string): void;
  cancelWorkout(): void;
  showRest(endsAt: number, url: string): void;
  cancelRest(): void;
};

/**
 * The native side lives in `modules/workout-notifications` and only exists in
 * Android builds. Elsewhere (iOS, web, Expo Go) it is missing, and the session
 * simply runs without notifications.
 */
export const WorkoutNotifications =
  requireOptionalNativeModule<WorkoutNotificationsModule>('WorkoutNotifications');
