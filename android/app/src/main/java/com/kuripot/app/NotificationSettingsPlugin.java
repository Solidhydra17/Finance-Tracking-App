package com.kuripot.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NotificationSettings")
public class NotificationSettingsPlugin extends Plugin {

  @PluginMethod
  public void openChannelSettings(PluginCall call) {
    MainActivity activity = (MainActivity) getActivity();
    if (activity != null) {
      activity.openNotificationChannelSettings();
    }
    call.resolve();
  }
}
