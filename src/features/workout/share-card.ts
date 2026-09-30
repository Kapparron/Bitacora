import * as Sharing from 'expo-sharing';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/**
 * Hands one summary card to whatever the phone can share with, as a picture.
 * The link to the web page is a different thing and stays with sendWorkout:
 * Android cannot reliably send a picture and a text together.
 *
 * The capture is written to the cache directory, which the system clears on
 * its own.
 */
export async function shareCardImage(view: View): Promise<void> {
  const uri = await captureRef(view, { format: 'png', quality: 1, result: 'tmpfile' });
  if (!(await Sharing.isAvailableAsync())) return;

  try {
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartir tarjeta' });
  } catch {
    // Closing the share sheet is not a failure worth reporting.
  }
}
