package com.kuripot.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
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

  @PluginMethod
  public void refreshWidget(PluginCall call) {
    try {
      android.content.Context context = getContext();
      AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
      ComponentName widgetComponent = new ComponentName(context, WalletWidget.class);
      int[] widgetIds = appWidgetManager.getAppWidgetIds(widgetComponent);
      if (widgetIds != null && widgetIds.length > 0) {
        Intent updateIntent = new Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        updateIntent.setComponent(widgetComponent);
        updateIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, widgetIds);
        context.sendBroadcast(updateIntent);
      }
      call.resolve();
    } catch (Exception e) {
      call.reject("Widget refresh failed: " + e.getMessage());
    }
  }
}
