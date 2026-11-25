package expo.modules.notificationlistener

import android.app.Notification
import android.content.Context
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONArray
import org.json.JSONObject

class PlutilyaNotificationListener : NotificationListenerService() {

  companion object {
    private const val PREFS_NAME = "PlutilyaNotificationQueue"
    private const val KEY_QUEUE = "pending_notifications"
    private const val MAX_QUEUE_SIZE = 50

    /** Set by NotificationListenerModule when the JS runtime is active. */
    @Volatile
    var onNotificationCallback: ((Map<String, Any?>) -> Unit)? = null

    /** Read and clear the queued notifications. */
    fun consumePending(context: Context): List<Map<String, Any?>> {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val raw = prefs.getString(KEY_QUEUE, null) ?: return emptyList()
      prefs.edit().remove(KEY_QUEUE).apply()

      return try {
        val arr = JSONArray(raw)
        (0 until arr.length()).map { i ->
          val obj = arr.getJSONObject(i)
          mapOf<String, Any?>(
            "packageName" to obj.optString("packageName", ""),
            "title" to obj.optString("title", ""),
            "text" to obj.optString("text", ""),
            "timestamp" to obj.optLong("timestamp", 0L)
          )
        }
      } catch (_: Exception) {
        emptyList()
      }
    }
  }

  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    sbn ?: return

    // Ignore our own app's notifications
    if (sbn.packageName == applicationContext.packageName) return

    val extras = sbn.notification?.extras ?: return
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
    // Prefer bigText (full SMS content) over short text
    val text = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
      ?: extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
      ?: ""

    if (title.isBlank() && text.isBlank()) return

    val data = mapOf<String, Any?>(
      "packageName" to sbn.packageName,
      "title" to title,
      "text" to text,
      "timestamp" to sbn.postTime
    )

    // Emit to JS if the runtime is active
    onNotificationCallback?.invoke(data)

    // Always enqueue so pending drain works when app reopens
    enqueue(data)
  }

  private fun enqueue(data: Map<String, Any?>) {
    try {
      val prefs = applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val raw = prefs.getString(KEY_QUEUE, null)
      val arr = if (raw != null) {
        try { JSONArray(raw) } catch (_: Exception) { JSONArray() }
      } else JSONArray()

      val obj = JSONObject()
      data.forEach { (k, v) -> obj.put(k, v) }
      arr.put(obj)

      // Drop oldest if queue exceeds limit
      while (arr.length() > MAX_QUEUE_SIZE) arr.remove(0)

      prefs.edit().putString(KEY_QUEUE, arr.toString()).apply()
    } catch (_: Exception) {
      // Never crash the listener service
    }
  }
}
