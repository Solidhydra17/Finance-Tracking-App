package com.kuripot.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {

  companion object {
    // This MUST match the channelId used in src/lib/notifications.ts
    const val CHANNEL_ID = "kuripot_reminders"
    const val CHANNEL_NAME = "KURIPOT Reminders"
    const val CHANNEL_DESC = "Finance logging reminders"
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    registerPlugin(NotificationSettingsPlugin::class.java)
    super.onCreate(savedInstanceState)
    // Create channel BEFORE Capacitor initializes plugins
    // so LocalNotifications uses our high-importance channel
    createHighImportanceChannel()
  }

  private fun createHighImportanceChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val manager = getSystemService(Context.NOTIFICATION_SERVICE)
      as NotificationManager

    // If channel already exists with correct importance, skip
    val existing = manager.getNotificationChannel(CHANNEL_ID)
    if (existing != null && existing.importance >= NotificationManager.IMPORTANCE_HIGH) {
      return
    }

    // Delete old channel if it exists with wrong importance
    // (forces recreation with correct settings on reinstall)
    if (existing != null) {
      manager.deleteNotificationChannel(CHANNEL_ID)
    }

    val soundUri = Uri.parse(
      "android.resource://${packageName}/raw/kaching"
    )
    val audioAttrs = AudioAttributes.Builder()
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .setUsage(AudioAttributes.USAGE_NOTIFICATION)
      .build()

    val channel = NotificationChannel(
      CHANNEL_ID,
      CHANNEL_NAME,
      // IMPORTANCE_HIGH = floating heads-up banner + sound on all Android devices
      NotificationManager.IMPORTANCE_HIGH
    ).apply {
      description = CHANNEL_DESC
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 250, 150, 250)
      setSound(soundUri, audioAttrs)
      // Lock screen visibility: show notification but hide content
      lockscreenVisibility = android.app.Notification.VISIBILITY_PRIVATE
    }

    manager.createNotificationChannel(channel)
  }

  // Called from Capacitor plugin bridge when JS requests to open
  // the notification channel settings screen directly
  fun openNotificationChannelSettings() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val intent = Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS).apply {
        putExtra(Settings.EXTRA_APP_PACKAGE, packageName)
        putExtra(Settings.EXTRA_CHANNEL_ID, CHANNEL_ID)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      startActivity(intent)
    } else {
      // Android < 8: open app notification settings instead
      val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
        putExtra(Settings.EXTRA_APP_PACKAGE, packageName)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      startActivity(intent)
    }
  }
}
