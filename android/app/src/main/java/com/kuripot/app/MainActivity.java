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
    createChannels();
    super.onCreate(savedInstanceState);
  }

  private void createChannels() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

    NotificationManager manager =
      (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    if (manager == null) return;

    // Delete both channels to force recreation with IMPORTANCE_HIGH
    manager.deleteNotificationChannel("default");
    manager.deleteNotificationChannel(CHANNEL_ID);

    Uri soundUri = Uri.parse(
      "android.resource://" + getPackageName() + "/raw/kaching"
    );
    AudioAttributes audioAttrs = new AudioAttributes.Builder()
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .setUsage(AudioAttributes.USAGE_NOTIFICATION)
      .build();

    // Create the default channel (just in case Capacitor still expects it)
    NotificationChannel defaultChannel = new NotificationChannel(
      "default",
      "Default",
      NotificationManager.IMPORTANCE_HIGH
    );
    defaultChannel.setSound(soundUri, audioAttrs);
    manager.createNotificationChannel(defaultChannel);

    // Create our custom channel
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
