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

  private static final String CHANNEL_ID = "kuripot_reminders";
  private static final String CHANNEL_NAME = "KURIPOT Reminders";
  private static final String CHANNEL_DESC = "Finance logging reminders";

  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(NotificationSettingsPlugin.class);
    // Create channels BEFORE super.onCreate() so Capacitor's LocalNotifications
    // plugin finds our high-importance channels already in place and does not
    // create a low-importance "default" channel on its own.
    createChannels();
    super.onCreate(savedInstanceState);
  }

  private void createChannels() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

    NotificationManager manager =
      (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    if (manager == null) return;

    Uri soundUri = Uri.parse(
      "android.resource://" + getPackageName() + "/raw/kaching"
    );
    AudioAttributes audioAttrs = new AudioAttributes.Builder()
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .setUsage(AudioAttributes.USAGE_NOTIFICATION)
      .build();

    // Delete any existing channels so we can recreate with correct settings.
    // Android locks channel importance after first creation — deleting forces reset.
    manager.deleteNotificationChannel("default");
    manager.deleteNotificationChannel(CHANNEL_ID);

    // "default" channel — Capacitor always falls back to this channel.
    // Must be IMPORTANCE_HIGH so floating banners work even if channelId is ignored.
    NotificationChannel defaultChannel = new NotificationChannel(
      "default",
      "KURIPOT Notifications",
      NotificationManager.IMPORTANCE_HIGH
    );
    defaultChannel.setDescription("General KURIPOT notifications");
    defaultChannel.enableVibration(true);
    defaultChannel.setVibrationPattern(new long[]{0, 250, 150, 250});
    defaultChannel.setSound(soundUri, audioAttrs);
    defaultChannel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PRIVATE);
    manager.createNotificationChannel(defaultChannel);

    // "kuripot_reminders" channel — explicitly targeted in notifications.ts
    NotificationChannel remindersChannel = new NotificationChannel(
      CHANNEL_ID,
      CHANNEL_NAME,
      NotificationManager.IMPORTANCE_HIGH
    );
    remindersChannel.setDescription(CHANNEL_DESC);
    remindersChannel.enableVibration(true);
    remindersChannel.setVibrationPattern(new long[]{0, 250, 150, 250});
    remindersChannel.setSound(soundUri, audioAttrs);
    remindersChannel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PRIVATE);
    manager.createNotificationChannel(remindersChannel);
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
