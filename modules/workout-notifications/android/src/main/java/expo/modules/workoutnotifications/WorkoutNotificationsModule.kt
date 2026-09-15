package expo.modules.workoutnotifications

import android.Manifest
import android.content.Context
import android.os.Build
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class WorkoutNotificationsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("WorkoutNotifications")

    // Resolves whether notifications can be posted once the prompt is answered.
    // Before Android 13 there is no prompt: they are on unless turned off in the
    // system settings.
    AsyncFunction("requestPermissionAsync") { promise: Promise ->
      val permissions = appContext.permissions
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || permissions == null) {
        promise.resolve(Notifier.enabled(context))
        return@AsyncFunction
      }

      permissions.askForPermissions(
        { promise.resolve(Notifier.enabled(context)) },
        Manifest.permission.POST_NOTIFICATIONS
      )
    }

    Function("showWorkout") { title: String, text: String, startedAt: Double, url: String ->
      Notifier.showWorkout(context, title, text, startedAt.toLong(), url)
    }

    Function("cancelWorkout") {
      Notifier.cancelWorkout(context)
    }

    Function("showRest") { endsAt: Double, url: String ->
      Notifier.showRest(context, endsAt.toLong(), url)
    }

    Function("cancelRest") {
      Notifier.cancelRest(context)
    }
  }
}
