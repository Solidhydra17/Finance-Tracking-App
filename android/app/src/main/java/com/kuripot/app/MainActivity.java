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

  private static final String CHANNEL_ID = "kuripot_reminders_v3";

  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(NotificationSettingsPlugin.class);
    super.onCreate(savedInstanceState);
  }

  public void openNotificationChannelSettings() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
      intent.putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName());
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
