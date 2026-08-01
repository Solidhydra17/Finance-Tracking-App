package com.kuripot.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  // We use "default" as the channel ID because:
  // 1. Capacitor LocalNotifications always sends to "default" when no channelId is set.
  // 2. Android does not allow changing channel importance after first creation.
  // 3. By creating "default" with IMPORTANCE_HIGH BEFORE super.onCreate(),
  //    Capacitor finds the channel already configured and leaves it alone.
  // 4. We name it "KURIPOT Reminders" so users see a friendly label in Settings.
  private static final String CHANNEL_ID = "default";
  private static final String CHANNEL_NAME = "KURIPOT Reminders";
  private static final String CHANNEL_DESC = "Finance logging reminders";

  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(NotificationSettingsPlugin.class);
    // IMPORTANT: configureDefaultChannel() MUST be called before super.onCreate().
    // Capacitor initializes LocalNotifications inside super.onCreate() and will
    // create the "default" channel with IMPORTANCE_DEFAULT (no floating banners)
    // if it does not already exist. By creating it here first with IMPORTANCE_HIGH,
    // Capacitor sees the channel already exists and skips its own creation.
    configureDefaultChannel();
    super.onCreate(savedInstanceState);
  }

  private void configureDefaultChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

    NotificationManager manager =
      (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    if (manager == null) return;

    // Check if channel already exists with correct importance.
    // If it does, update name/description (Android allows this) but skip recreation.
    NotificationChannel existing = manager.getNotificationChannel(CHANNEL_ID);
    if (existing != null && existing.getImportance() >= NotificationManager.IMPORTANCE_HIGH) {
      // Channel exists and importance is already correct. Just update display fields.
      // Note: importance cannot be changed programmatically once set by the OS.
      return;
    }

    // Channel either doesn't exist or has wrong importance — (re)create it.
    // On a fresh install this creates "default" with IMPORTANCE_HIGH before Capacitor.
    // On an existing install where the user previously had IMPORTANCE_DEFAULT,
    // they must uninstall + reinstall for Android to honor the new importance.
    if (existing != null) {
      manager.deleteNotificationChannel(CHANNEL_ID);
    }

    Uri soundUri = Uri.parse(
      "android.resource://" + getPackageName() + "/raw/kaching"
    );
    AudioAttributes audioAttrs = new AudioAttributes.Builder()
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .setUsage(AudioAttributes.USAGE_NOTIFICATION)
      .build();

    NotificationChannel channel = new NotificationChannel(
      CHANNEL_ID,
      CHANNEL_NAME,
      NotificationManager.IMPORTANCE_HIGH
    );
    channel.setDescription(CHANNEL_DESC);
    channel.enableVibration(true);
    channel.setVibrationPattern(new long[]{0, 250, 150, 250});
    channel.setSound(soundUri, audioAttrs);
    channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PRIVATE);

    manager.createNotificationChannel(channel);
  }

  public void openNotificationChannelSettings() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Intent intent = new Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS);
      intent.putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName());
      intent.putExtra(Settings.EXTRA_CHANNEL_ID, CHANNEL_ID);
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      startActivity(intent);
    } else {
      Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
      intent.putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName());
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      startActivity(intent);
    }
  }
}
