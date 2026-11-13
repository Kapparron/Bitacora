package expo.modules.workoutnotifications

import android.app.ActivityManager
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat

/**
 * Posts the notification of a session in progress. There is one, and it
 * changes with the moment:
 *
 * - training: the session's name and sets, with its running time;
 * - resting: "Descanso" counting down, with the session's name under it;
 * - rest over: "Descanso terminado", the only one that rings and vibrates.
 *
 * One rather than a notification for the session and another for the rest,
 * because the rest alert then lit up both: on the lock screen and in the status
 * bar the session came along with it.
 *
 * What it shows counts on the system clock rather than on updates from the app:
 * a notification's chronometer keeps running while the app is frozen, and an
 * exact alarm wakes the device when the rest is over. That alarm can fire with
 * the app gone, so what the notification needs to be drawn is kept in
 * SharedPreferences rather than in memory.
 */
internal object Notifier {
  private const val WORKOUT_CHANNEL = "workout"
  private const val REST_CHANNEL = "rest"
  /**
   * The end of a rest rings the app's own bell. A channel's sound is fixed once
   * it exists, so the bell came with a new channel; the one before it, which
   * rang the system's default sound, is removed.
   */
  private const val REST_DONE_CHANNEL = "rest-bell"
  private const val OLD_REST_DONE_CHANNEL = "rest-done"

  /** The one notification of the session, whatever it is showing. */
  private const val SESSION_ID = 1

  /**
   * Where a rest countdown used to be posted on its own. Cleared on the way, so
   * a countdown left over from an earlier version of the app does not linger.
   */
  private const val OLD_REST_ID = 2

  private const val PREFERENCES = "workout-notifications"
  private const val KEY_TITLE = "title"
  private const val KEY_TEXT = "text"
  private const val KEY_STARTED_AT = "startedAt"
  private const val KEY_URL = "url"
  private const val KEY_REST_ENDS_AT = "restEndsAt"

  const val EXTRA_URL = "url"

  fun enabled(context: Context): Boolean = manager(context).areNotificationsEnabled()

  /** The session's name, sets and start, drawn now or under a rest countdown. */
  fun showWorkout(context: Context, title: String, text: String, startedAt: Long, url: String) {
    preferences(context).edit()
      .putString(KEY_TITLE, title)
      .putString(KEY_TEXT, text)
      .putLong(KEY_STARTED_AT, startedAt)
      .putString(KEY_URL, url)
      .apply()

    post(context)
  }

  fun cancelWorkout(context: Context) {
    cancelAlarm(context)
    preferences(context).edit().clear().apply()
    manager(context).cancel(SESSION_ID)
    manager(context).cancel(OLD_REST_ID)
  }

  /** Turns the session's notification into a countdown, and sets the alarm for its end. */
  fun showRest(context: Context, endsAt: Long, url: String) {
    preferences(context).edit().putLong(KEY_REST_ENDS_AT, endsAt).apply()
    post(context)

    val alarm = context.getSystemService(AlarmManager::class.java)
    val pending = restEndIntent(context, url)

    // Without the exact alarm permission the alert may come late, which still
    // beats not coming at all.
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarm.canScheduleExactAlarms()) {
      alarm.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endsAt, pending)
    } else {
      alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endsAt, pending)
    }
  }

  /** The rest is over or was stopped: back to the session. */
  fun cancelRest(context: Context) {
    cancelAlarm(context)
    preferences(context).edit().remove(KEY_REST_ENDS_AT).apply()
    post(context)
  }

  /** Fired by the alarm at the end of a rest. */
  fun showRestDone(context: Context, url: String) {
    preferences(context).edit().remove(KEY_REST_ENDS_AT).apply()

    // With the app on screen the rest timer bar already rings, and a second
    // alert on top of it would only be noise: the session is drawn back quietly.
    if (inForeground()) {
      post(context)
      return
    }

    if (!enabled(context)) return
    ensureChannels(context)

    val notification = NotificationCompat.Builder(context, REST_DONE_CHANNEL)
      .setSmallIcon(smallIcon(context))
      .setContentTitle("Descanso terminado")
      .setContentText(sessionLine(context) ?: "A por la siguiente serie")
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      // Before Android 8 the sound goes on the notification; from then on, on the channel.
      .setSound(bellUri(context))
      .setDefaults(NotificationCompat.DEFAULT_VIBRATE or NotificationCompat.DEFAULT_LIGHTS)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setAutoCancel(true)
      .setContentIntent(openIntent(context, url))
      .build()

    manager(context).notify(SESSION_ID, notification)
  }

  /** Draws the session's notification as training or as resting, whichever it is now. */
  private fun post(context: Context) {
    val stored = preferences(context)
    val title = stored.getString(KEY_TITLE, null) ?: return
    val url = stored.getString(KEY_URL, null) ?: return
    if (!enabled(context)) return
    ensureChannels(context)

    val restEndsAt = stored.getLong(KEY_REST_ENDS_AT, 0)
    val notification =
      if (restEndsAt > System.currentTimeMillis()) {
        restNotification(context, restEndsAt, url)
      } else {
        val text = stored.getString(KEY_TEXT, "") ?: ""
        workoutNotification(context, title, text, stored.getLong(KEY_STARTED_AT, 0), url)
      }

    manager(context).cancel(OLD_REST_ID)
    manager(context).notify(SESSION_ID, notification)
  }

  private fun workoutNotification(
    context: Context,
    title: String,
    text: String,
    startedAt: Long,
    url: String,
  ): Notification =
    NotificationCompat.Builder(context, WORKOUT_CHANNEL)
      .setSmallIcon(smallIcon(context))
      .setContentTitle(title)
      .setContentText(text)
      .setWhen(startedAt)
      .setShowWhen(true)
      .setUsesChronometer(true)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setCategory(NotificationCompat.CATEGORY_WORKOUT)
      .setContentIntent(openIntent(context, url))
      .build()

  private fun restNotification(context: Context, endsAt: Long, url: String): Notification =
    NotificationCompat.Builder(context, REST_CHANNEL)
      .setSmallIcon(smallIcon(context))
      .setContentTitle("Descanso")
      .setContentText(sessionLine(context))
      .setWhen(endsAt)
      .setShowWhen(true)
      .setUsesChronometer(true)
      .setChronometerCountDown(true)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
      .setContentIntent(openIntent(context, url))
      .build()

  /** "Empuje A · 12 series", the session under a rest. */
  private fun sessionLine(context: Context): String? {
    val stored = preferences(context)
    val title = stored.getString(KEY_TITLE, null) ?: return null
    val text = stored.getString(KEY_TEXT, null)
    return if (text.isNullOrEmpty()) title else "$title · $text"
  }

  private fun cancelAlarm(context: Context) {
    context.getSystemService(AlarmManager::class.java).cancel(restEndIntent(context, ""))
  }

  private fun preferences(context: Context) =
    context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)

  private fun manager(context: Context) = context.getSystemService(NotificationManager::class.java)

  private fun ensureChannels(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    // A notification sound, not an alarm one: it follows the ringer, so a phone
    // put on silent stays silent, as the app's own bell does.
    val bell = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_NOTIFICATION)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()

    val channels = listOf(
      NotificationChannel(WORKOUT_CHANNEL, "Entreno en curso", NotificationManager.IMPORTANCE_LOW),
      NotificationChannel(REST_CHANNEL, "Descanso", NotificationManager.IMPORTANCE_LOW),
      NotificationChannel(REST_DONE_CHANNEL, "Fin del descanso", NotificationManager.IMPORTANCE_HIGH)
        .apply {
          enableVibration(true)
          setSound(bellUri(context), bell)
        },
    )

    // Creating a channel that already exists is a no-op, and keeps whatever the
    // user changed in the system settings.
    manager(context).createNotificationChannels(channels)
    manager(context).deleteNotificationChannel(OLD_REST_DONE_CHANNEL)
  }

  private fun openIntent(context: Context, url: String): PendingIntent {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).setPackage(context.packageName)
    return PendingIntent.getActivity(
      context,
      0,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  // The extras are not part of what makes two pending intents equal, so the one
  // built to cancel matches the one that was scheduled.
  private fun restEndIntent(context: Context, url: String): PendingIntent {
    val intent = Intent(context, RestEndReceiver::class.java).putExtra(EXTRA_URL, url)
    return PendingIntent.getBroadcast(
      context,
      0,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  /** The bell in res/raw, the same sound the app rings with the screen on. */
  private fun bellUri(context: Context): Uri {
    val id = context.resources.getIdentifier("rest_done", "raw", context.packageName)
    return Uri.parse("android.resource://${context.packageName}/$id")
  }

  // The adaptive icon would show as a solid blob in the status bar; its
  // monochrome layer is the silhouette the status bar expects.
  fun smallIcon(context: Context): Int {
    val monochrome = context.resources.getIdentifier("ic_launcher_monochrome", "mipmap", context.packageName)
    return if (monochrome != 0) monochrome else context.applicationInfo.icon
  }

  private fun inForeground(): Boolean {
    val state = ActivityManager.RunningAppProcessInfo()
    ActivityManager.getMyMemoryState(state)
    return state.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
  }
}
