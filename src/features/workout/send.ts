import { Share } from 'react-native';

import { getWorkoutContents } from './queries';
import { toSharedWorkout, workoutLink } from './share';

/**
 * Hands a finished session to whatever the phone can share with, as a link to
 * the web page that draws it. Nothing is uploaded: the session is the link.
 */
export async function sendWorkout(workoutId: string): Promise<void> {
  const contents = await getWorkoutContents(workoutId);
  if (!contents) return;

  const link = workoutLink(toSharedWorkout(contents));

  try {
    await Share.share({ message: `Entreno "${contents.workout.name}" en Bitacora:\n${link}` });
  } catch {
    // Closing the share sheet is not a failure worth reporting.
  }
}
