package expo.modules.notificationlistener

import android.content.ComponentName
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NotificationListenerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NotificationListener")

    Events("onNotificationReceived")

    OnCreate {
      PlutilyaNotificationListener.onNotificationCallback = { data ->
        sendEvent("onNotificationReceived", data)
      }
    }

    OnDestroy {
      PlutilyaNotificationListener.onNotificationCallback = null
    }

    Function("isPermissionGranted") {
      val ctx = appContext.reactContext ?: return@Function false
      val flat = Settings.Secure.getString(
        ctx.contentResolver,
        "enabled_notification_listeners"
      ) ?: return@Function false
      val component = ComponentName(ctx, PlutilyaNotificationListener::class.java)
      flat.contains(component.flattenToString())
    }

    Function("openNotificationAccessSettings") {
      val ctx = appContext.reactContext ?: return@Function
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      ctx.startActivity(intent)
    }

    Function("consumePendingNotifications") {
      val ctx = appContext.reactContext
        ?: return@Function emptyList<Map<String, Any?>>()
      PlutilyaNotificationListener.consumePending(ctx)
    }
  }
}
