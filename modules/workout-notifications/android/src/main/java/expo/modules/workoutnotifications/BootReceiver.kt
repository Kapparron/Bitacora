package expo.modules.workoutnotifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * A restart clears every alarm, and so does installing a new version of the
 * app. Both are told here, and the reminders are set again from the list kept
 * when they were planned.
 */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED -> Reminders.reschedule(context)
    }
  }
}
