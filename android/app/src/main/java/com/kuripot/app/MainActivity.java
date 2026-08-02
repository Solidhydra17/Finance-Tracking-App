package com.kuripot.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  private static final String CHANNEL_ID = "kuripot_reminders";
  private static final String CHANNEL_NAME = "KURIPOT Reminders";
  private static final String CHANNEL_DESC = "Finance logging reminders";

  // Old channel IDs to clean up
  private static final String[] OLD_CHANNEL_IDS = {
    "kuripot_reminders_v2", "kuripot_reminders_v3", "kuripot_reminders_v4", "kuripot_reminders_v5"
  };

  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(NotificationSettingsPlugin.class);
    // MUST run before super.onCreate() so that the channel exists with
    // IMPORTANCE_HIGH + sound + vibration before Capacitor initializes.
    // Capacitor will see the channel already exists and leave it alone.
    configureNotificationChannel();
    super.onCreate(savedInstanceState);
  }

  private void configureNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

    NotificationManager manager =
      (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    if (manager == null) return;

    // 1. Delete old stale channels
    for (String oldId : OLD_CHANNEL_IDS) {
      try { manager.deleteNotificationChannel(oldId); } catch (Exception ignored) {}
    }

    // Delete current channels to force recreation
    manager.deleteNotificationChannel(CHANNEL_ID);
    manager.deleteNotificationChannel("default");

    // 2. Create the channel fresh with ALL settings maxed out
    Uri soundUri = Uri.parse(
      ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + getPackageName() + "/raw/kaching"
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
    channel.enableLights(true);
    channel.setLightColor(0xFF285CCC);
    channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
    channel.setBypassDnd(false);
    channel.setShowBadge(true);

    manager.createNotificationChannel(channel);

    // Recreate default channel with high importance as requested
    NotificationChannel defaultChannel = new NotificationChannel(
      "default",
      CHANNEL_NAME,
      NotificationManager.IMPORTANCE_HIGH
    );
    defaultChannel.setDescription(CHANNEL_DESC);
    defaultChannel.enableVibration(true);
    defaultChannel.setVibrationPattern(new long[]{0, 250, 150, 250});
    defaultChannel.setSound(soundUri, audioAttrs);
    defaultChannel.enableLights(true);
    defaultChannel.setLightColor(0xFF285CCC);
    defaultChannel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
    defaultChannel.setBypassDnd(false);
    defaultChannel.setShowBadge(true);
    
    manager.createNotificationChannel(defaultChannel);
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
