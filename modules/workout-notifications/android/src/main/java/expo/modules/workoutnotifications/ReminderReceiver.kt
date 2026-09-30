package expo.modules.workoutnotifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Fired by the alarm of one reminder. */
class ReminderReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    Reminders.post(
      context,
      intent.getStringExtra(Reminders.EXTRA_ID) ?: return,
      intent.getStringExtra(Reminders.EXTRA_TITLE) ?: return,
      intent.getStringExtra(Reminders.EXTRA_TEXT) ?: "",
      intent.getStringExtra(Reminders.EXTRA_URL) ?: return,
    )
  }
}
