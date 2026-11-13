package expo.modules.workoutnotifications

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import org.json.JSONObject

/**
 * The day's reminders: the routine due that morning and the events coming up.
 *
 * The app works out which and when (src/features/reminders/plan.ts) and hands
 * them over as a whole; this only posts each one at its time, as a plain
 * notification to be swiped away. The list is kept, so the alarms can be set
 * again when the phone restarts, which clears them all.
 */
internal object Reminders {
  private const val CHANNEL = "reminders"
  private const val PREFERENCES = "workout-reminders"
  private const val KEY_LIST = "list"

  private const val ACTION = "expo.modules.workoutnotifications.REMINDER"
  const val EXTRA_ID = "id"
  const val EXTRA_TITLE = "title"
  const val EXTRA_TEXT = "text"
  const val EXTRA_URL = "url"

  /**
   * Replaces every reminder with `json`, a list of `{ id, at, title, text, url }`.
   * The ones planned before and not in the new list are cancelled.
   */
  fun schedule(context: Context, json: String) {
    val previous = stored(context)
    val next = JSONArray(json)

    for (index in 0 until previous.length()) cancel(context, previous.getJSONObject(index))
    preferences(context).edit().putString(KEY_LIST, next.toString()).apply()
    setAlarms(context, next)
  }

  /** After a restart: the alarms are gone, the list is not. */
  fun reschedule(context: Context) {
    setAlarms(context, stored(context))
  }

  /** Fired by a reminder's alarm. */
  fun post(context: Context, id: String, title: String, text: String, url: String) {
    val manager = context.getSystemService(NotificationManager::class.java)
    if (!manager.areNotificationsEnabled()) return

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL, "Recordatorios", NotificationManager.IMPORTANCE_DEFAULT)
      )
    }

    val open = PendingIntent.getActivity(
      context,
      id.hashCode(),
      Intent(Intent.ACTION_VIEW, Uri.parse(url)).setPackage(context.packageName),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    val notification = NotificationCompat.Builder(context, CHANNEL)
      .setSmallIcon(Notifier.smallIcon(context))
      .setContentTitle(title)
      .setContentText(text)
      .setCategory(NotificationCompat.CATEGORY_REMINDER)
      .setAutoCancel(true)
      .setContentIntent(open)
      .build()

    // Its own id, well clear of the session's notification.
    manager.notify(TAG, id.hashCode(), notification)
  }

  private const val TAG = "reminder"

  private fun setAlarms(context: Context, reminders: JSONArray) {
    val alarm = context.getSystemService(AlarmManager::class.java)
    val now = System.currentTimeMillis()

    for (index in 0 until reminders.length()) {
      val reminder = reminders.getJSONObject(index)
      val at = reminder.getLong("at")
      if (at <= now) continue

      // A reminder is not a timer: a few minutes late is fine, so an inexact
      // alarm does when the exact ones are not allowed.
      val pending = intent(context, reminder)
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarm.canScheduleExactAlarms()) {
        alarm.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
      } else {
        alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
      }
    }
  }

  private fun cancel(context: Context, reminder: JSONObject) {
    context.getSystemService(AlarmManager::class.java).cancel(intent(context, reminder))
  }

  // One pending intent per reminder: the data URI, unlike the extras, is part
  // of what tells two of them apart.
  private fun intent(context: Context, reminder: JSONObject): PendingIntent {
    val id = reminder.getString("id")
    val intent = Intent(context, ReminderReceiver::class.java)
      .setAction(ACTION)
      .setData(Uri.parse("bitacora-reminder://$id"))
      .putExtra(EXTRA_ID, id)
      .putExtra(EXTRA_TITLE, reminder.optString("title"))
      .putExtra(EXTRA_TEXT, reminder.optString("text"))
      .putExtra(EXTRA_URL, reminder.optString("url"))

    return PendingIntent.getBroadcast(
      context,
      id.hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun stored(context: Context): JSONArray =
    runCatching { JSONArray(preferences(context).getString(KEY_LIST, "[]")) }.getOrDefault(JSONArray())

  private fun preferences(context: Context) =
    context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
}
