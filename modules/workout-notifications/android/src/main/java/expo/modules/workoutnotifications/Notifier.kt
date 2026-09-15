package expo.modules.workoutnotifications

import android.app.ActivityManager
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat

/**
 * Posts the notifications of a session in progress. Both count on the system
 * clock rather than on updates from the app: the chronometer of a notification
 * keeps running while the app is frozen in the background, and an exact alarm
 * wakes the device when the rest is over.
 */
internal object Notifier {
  private const val WORKOUT_CHANNEL = "workout"
  private const val REST_CHANNEL = "rest"
  private const val REST_DONE_CHANNEL = "rest-done"

  private const val WORKOUT_ID = 1

  // The countdown and the alert share an id, so the alert replaces the countdown
  // instead of stacking under it.
  private const val REST_ID = 2

  const val EXTRA_URL = "url"

  fun enabled(context: Context): Boolean = manager(context).areNotificationsEnabled()

  fun showWorkout(context: Context, title: String, text: String, startedAt: Long, url: String) {
    if (!enabled(context)) return
    ensureChannels(context)

    val notification = NotificationCompat.Builder(context, WORKOUT_CHANNEL)
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

    manager(context).notify(WORKOUT_ID, notification)
  }

  fun cancelWorkout(context: Context) {
    manager(context).cancel(WORKOUT_ID)
  }

  fun showRest(context: Context, endsAt: Long, url: String) {
    if (!enabled(context)) return
    ensureChannels(context)

    val notification = NotificationCompat.Builder(context, REST_CHANNEL)
      .setSmallIcon(smallIcon(context))
      .setContentTitle("Descanso")
      .setWhen(endsAt)
      .setShowWhen(true)
      .setUsesChronometer(true)
      .setChronometerCountDown(true)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
      .setContentIntent(openIntent(context, url))
      .build()

    manager(context).notify(REST_ID, notification)

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

  fun cancelRest(context: Context) {
    context.getSystemService(AlarmManager::class.java).cancel(restEndIntent(context, ""))
    manager(context).cancel(REST_ID)
  }

  fun showRestDone(context: Context, url: String) {
    // With the app on screen the rest timer bar already rings, and a second
    // alert on top of it would only be noise.
    if (inForeground()) {
      manager(context).cancel(REST_ID)
      return
    }

    if (!enabled(context)) return
    ensureChannels(context)

    val notification = NotificationCompat.Builder(context, REST_DONE_CHANNEL)
      .setSmallIcon(smallIcon(context))
      .setContentTitle("Descanso terminado")
      .setContentText("A por la siguiente serie")
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setDefaults(NotificationCompat.DEFAULT_ALL)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setAutoCancel(true)
      .setContentIntent(openIntent(context, url))
      .build()

    manager(context).notify(REST_ID, notification)
  }

  private fun manager(context: Context) = context.getSystemService(NotificationManager::class.java)

  private fun ensureChannels(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val channels = listOf(
      NotificationChannel(WORKOUT_CHANNEL, "Entreno en curso", NotificationManager.IMPORTANCE_LOW),
      NotificationChannel(REST_CHANNEL, "Descanso", NotificationManager.IMPORTANCE_LOW),
      NotificationChannel(REST_DONE_CHANNEL, "Fin del descanso", NotificationManager.IMPORTANCE_HIGH)
        .apply { enableVibration(true) },
    )

    // Creating a channel that already exists is a no-op, and keeps whatever the
    // user changed in the system settings.
    manager(context).createNotificationChannels(channels)
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

  // The adaptive icon would show as a solid blob in the status bar; its
  // monochrome layer is the silhouette the status bar expects.
  private fun smallIcon(context: Context): Int {
    val monochrome = context.resources.getIdentifier("ic_launcher_monochrome", "mipmap", context.packageName)
    return if (monochrome != 0) monochrome else context.applicationInfo.icon
  }

  private fun inForeground(): Boolean {
    val state = ActivityManager.RunningAppProcessInfo()
    ActivityManager.getMyMemoryState(state)
    return state.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
  }
}
