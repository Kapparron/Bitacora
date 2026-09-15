package expo.modules.workoutnotifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Fired by the alarm set for the end of a rest. */
class RestEndReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    Notifier.showRestDone(context, intent.getStringExtra(Notifier.EXTRA_URL) ?: return)
  }
}
